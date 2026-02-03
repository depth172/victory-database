import { createClient } from "@supabase/supabase-js";

type SpecialMoveIngest = {
	number: number;
	name: string;
	description: string;
	thumbnail: string;
	category: "shoot" | "offense" | "defense" | "keeper";
	source_key?: string;
};

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

function isValidCategory(x: unknown): x is SpecialMoveIngest["category"] {
	return x === "shoot" || x === "offense" || x === "defense" || x === "keeper";
}

function thumbnailToFileName(thumbnail: string): string {
	const noHash = thumbnail.split("#", 1)[0] ?? "";
	const noQuery = noHash.split("?", 1)[0] ?? "";
	const parts = noQuery.split("/");
	return parts[parts.length - 1] ?? "";
}

function isSpecialMoveIngest(x: unknown): x is SpecialMoveIngest {
	const obj = x as Record<string, unknown>;
	if (x === null || typeof x !== "object") return false;

	const name = obj.name;
	const description = obj.description;
	const thumbnail = obj.thumbnail;
	const category = obj.category;
	const number = obj.number;

	return (
		typeof name === "string" &&
		name.length > 0 &&
		name !== "？？？" &&
		typeof description === "string" &&
		typeof thumbnail === "string" &&
		thumbnail.length > 0 &&
		typeof number === "number" &&
		Number.isFinite(number) &&
		isValidCategory(category)
	);
}

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
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

	const raw: unknown[] = Array.isArray(payload)
		? payload
		: (payload &&
			typeof payload === "object" &&
			"specialMoves" in payload &&
			Array.isArray((payload as Record<string, unknown>).specialMoves))
			? ((payload as Record<string, unknown>).specialMoves as unknown[])
			: [];

	if (!Array.isArray(raw) || raw.length === 0) {
		return json(400, { ok: false, error: "No special moves provided" });
	}

	// バリデーション + 正規化（source_keyはthumbnailから生成）
	const invalid: { index: number; reason: string }[] = [];
	const moves: Array<{
		source_key: string;
		number: number;
		name: string;
		description: string;
		thumbnail: string;
		category: SpecialMoveIngest["category"];
	}> = [];

	for (let i = 0; i < raw.length; i++) {
		const p = raw[i];
		if (!isSpecialMoveIngest(p)) {
			invalid.push({ index: i, reason: "Invalid special move shape" });
			continue;
		}

		const fileName = thumbnailToFileName(p.thumbnail);
		if (!fileName) {
			invalid.push({ index: i, reason: "thumbnail has no filename" });
			continue;
		}

		moves.push({
			source_key: fileName, // 仕様: source_keyはファイル名
			number: p.number,
			name: p.name,
			description: p.description,
			thumbnail: p.thumbnail,
			category: p.category,
		});
	}

	if (moves.length === 0) {
		return json(400, { ok: false, error: "All special moves invalid", invalid });
	}

	// Upsert（衝突条件はsource_key）
	const BATCH = Number(Deno.env.get("UPSERT_BATCH_SIZE") ?? "300");
	let upserted = 0;

	try {
		for (const group of chunk(moves, BATCH)) {
			const { error } = await supabase
				.schema("inagle")
				.from("special_moves")
				.upsert(group, { onConflict: "source_key" });

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
		received: raw.length,
		valid: moves.length,
		invalidCount: invalid.length,
		upserted,
		invalid: invalid.length ? invalid.slice(0, 50) : undefined,
	});
});
