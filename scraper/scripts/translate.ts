import { Player } from "@/shared/types";
import fs from "node:fs";
import path from "node:path";

type CsvRow = Record<string, string>;

type BuildMapValue = {
	name?: string; // "正義" みたいな表示名が入ってる想定
};

function parseCsv(text: string): CsvRow[] {
	const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim().length > 0);
	if (lines.length === 0) return [];

	const header = parseCsvLine(lines[0]);
	const rows: CsvRow[] = [];

	for (let i = 1; i < lines.length; i++) {
		const cols = parseCsvLine(lines[i]);
		const row: CsvRow = {};
		for (let c = 0; c < header.length; c++) {
			row[header[c]] = cols[c] ?? "";
		}
		rows.push(row);
	}

	return rows;
}

// ダブルクオート対応の最低限CSVパーサ（カンマ/改行がセル内に来るようなガチCSVには弱い）
function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	let cur = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];

		if (inQuotes) {
			if (ch === "\"") {
				const next = line[i + 1];
				if (next === "\"") {
					cur += "\"";
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				cur += ch;
			}
		} else {
			if (ch === ",") {
				out.push(cur);
				cur = "";
			} else if (ch === "\"") {
				inQuotes = true;
			} else {
				cur += ch;
			}
		}
	}

	out.push(cur);
	return out.map((s) => s.trim());
}

function extractIdFromViewUrl(viewUrl: string): string | null {
	try {
		const u = new URL(viewUrl);
		const q = u.searchParams.get("q");
		if (!q) return null;

		const id = q.slice(26, 35);
		if (id.length !== 9) return null;

		return id;
	} catch {
		return null;
	}
}

function normalize(s: string): string {
	return s
		.replace(/\u3000/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function normalizeDescLoose(s: string): string {
	return s
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/\n/g, " ")
		.replace(/\u3000/g, " ")
		.replace(/[ \t]+/g, " ")
		.trim();
}

function main() {
	// 入力パスは好きに変えていい
	const csvPath = path.resolve(__dirname, "..", "..", "..", "data", "characters.csv");
	const charsPath = path.resolve(__dirname, "..", "..", "..", "..", "ui", "data", "players.json"); // 例のキャラ配列JSON
	const outPath = path.resolve(__dirname, "..", "..", "..", "data", "builds.json");

	const csvText = fs.readFileSync(csvPath, "utf-8");
	const csvRows = parseCsv(csvText);

	const charactersJson = JSON.parse(fs.readFileSync(charsPath, "utf-8"));
	const characters = charactersJson.players as Player[];

	const buildMap = {
		"せいぎ": { name: "正義" },
		"ラフ": { name: "ラフプレー" },
		"きずな": { name: "キズナ" },
		"テンション": { name: "テンション" },
		"カウンター": { name: "カウンター" },
		"ひっさつ": { name: "ひっさつ" }
	} as Record<string, BuildMapValue | string>;

	// 検索用インデックス（名前 + 作品）
	const descIndex = new Map<string, Player[]>();
	for (const ch of characters) {
		const nd = normalizeDescLoose(ch.description ?? "");
		if (!nd) continue;

		const list = descIndex.get(nd) ?? [];
		list.push(ch);
		descIndex.set(nd, list);
	}

	const out: Record<string, string> = {};

	for (const row of csvRows) {
		const buildKana = normalize(row["ビルド"] ?? "");
		if (!buildKana) continue; // CSV側が空白なら無視

		const csvDesc = normalizeDescLoose(row["説明文"] ?? "");
		if (!csvDesc) continue;

		const candidates = descIndex.get(csvDesc) ?? [];

		const picked = candidates.find((c) => typeof c.view_url === "string" && c.view_url.length > 0) ?? candidates[0];
		if (!picked) continue;

		const id = extractIdFromViewUrl(picked.view_url);
		if (!id) continue;

		// buildMap が "せいぎ" -> {name:"正義"} または "せいぎ" -> "正義" のどっちでも動くようにする
		const mapped = buildMap[buildKana];
		let buildName = buildKana;

		if (typeof mapped === "string") {
			buildName = mapped;
		} else if (mapped && typeof mapped === "object" && typeof mapped.name === "string") {
			buildName = mapped.name;
		}

		out[id] = buildName;
	}

	fs.writeFileSync(outPath, JSON.stringify(out, null, "\t"), "utf-8");

}

main();
