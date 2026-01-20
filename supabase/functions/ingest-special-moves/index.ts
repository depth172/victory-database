import { createClient } from "@supabase/supabase-js";

type SpecialMove = {
	id: string;
	name: string;
	description: string;
	movie_url: string;
	type: string;
}

function json(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

function chunk<T>(arr: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

function isSpecialMove(x: unknown): x is SpecialMove {
	const obj = x as Record<string, unknown>;
	return (
		x !== null &&
		typeof x === "object" &&
		typeof obj.id === "string" &&
		obj.id.length > 0 &&
		typeof obj.name === "string"
	);
}

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		// 念の為CORSプリフライト対応
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "content-type, x-ingest-key",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
			},
		});
	}

	if (req.method !== "POST") {
		return json(405, { ok: false, error: "Method Not Allowed" });
	}

	// 認証（共有鍵）
	const ingestKey = req.headers.get("x-ingest-key");
	const expectedKey = Deno.env.get("INGEST_KEY");

	if (!expectedKey) {
		return json(500, { ok: false, error: "Server misconfigured: INGEST_KEY missing" });
	}
	if (!ingestKey || ingestKey !== expectedKey) {
		return json(401, { ok: false, error: "Unauthorized" });
	}

	// Supabase client（Service Role）
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!supabaseUrl || !serviceRoleKey) {
		return json(500, { ok: false, error: "Server misconfigured: Supabase env missing" });
	}
	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false },
	});

	// Body parse
	let payload: unknown;
	try {
		payload = await req.json();
	} catch {
		return json(400, { ok: false, error: "Invalid JSON" });
	}

	const specialMovesRaw: unknown[] = Array.isArray(payload)
		? payload
		: (payload && typeof payload === "object" && "specialMoves" in payload && Array.isArray((payload as Record<string, unknown>).specialMoves))
			? (payload as Record<string, unknown>).specialMoves as unknown[]
			: [];

	if (!Array.isArray(specialMovesRaw) || specialMovesRaw.length === 0) {
		return json(400, { ok: false, error: "No special moves provided" });
	}

	// 最低限のバリデーションと正規化
	const invalid: { index: number; reason: string }[] = [];
	const specialMoves: SpecialMove[] = [];

	for (let i = 0; i < specialMovesRaw.length; i++) {
		const p = specialMovesRaw[i];
		if (!isSpecialMove(p)) {
			invalid.push({ index: i, reason: "Invalid special move shape" });
			continue;
		}
		specialMoves.push(p);
	}

	if (specialMoves.length === 0) {
		return json(400, { ok: false, error: "All special moves invalid", invalid });
	}

	// Upsert
	const BATCH = Number(Deno.env.get("UPSERT_BATCH_SIZE") ?? "300");
	let upserted = 0;

	try {
		for (const group of chunk(specialMoves, BATCH)) {
			const { error } = await supabase
				.schema("inagle")
				.from("special_moves")
				.upsert(group, { onConflict: "id" });

			if (error) {
				return json(500, {
					ok: false,
					error: "Upsert failed",
					details: error,
					batchSize: group.length,
				});
			}
			upserted += group.length;
		}
	} catch (e) {
		return json(500, { ok: false, error: "Unexpected error", details: e });
	}

	return json(200, {
		ok: true,
		received: specialMovesRaw.length,
		valid: specialMoves.length,
		invalidCount: invalid.length,
		upserted,
		invalid: invalid.length ? invalid.slice(0, 50) : undefined, // 最大50件まで
	});
});
