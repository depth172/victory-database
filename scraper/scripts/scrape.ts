import * as fs from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";
import type { Player, PlayerElement, PlayerPosition } from "@/shared/types"

function csvEscape(v: string): string {
	const s = (v ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	if (/[",\n]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
	return s;
}

function toCsv(rows: Player[]): string {
	if (rows.length === 0) return "";
	const headers = Object.keys(rows[0]) as (keyof Player)[];
	const lines: string[] = [];
	lines.push(headers.join(","));
	for (const r of rows) {
		lines.push(headers.map((h) => csvEscape(String(r[h] ?? ""))).join(","));
	}
	return lines.join("\n") + "\n";
}

function getArg(name: string): string | null {
	const i = process.argv.indexOf(name);
	if (i === -1) return null;
	return process.argv[i + 1] ?? null;
}

function hasFlag(name: string): boolean {
	return process.argv.includes(name);
}

async function main() {
	const baseUrl = getArg("--base") ?? "https://zukan.inazuma.jp";
	const perPage = Number(getArg("--per-page") ?? "200");

	const __dirname = path.dirname(__filename);

	const outJson = path.resolve(__dirname, "..", "..", "..", "..", "ui", "data", "players.json");

	const maxPages = Number(getArg("--max-pages") ?? "999");
	const emptyStop = Number(getArg("--empty-stop") ?? "5");

	const headful = hasFlag("--headful");

	const browser = await chromium.launch({ headless: !headful });
	const page = await browser.newPage();

	const all: Player[] = [];
	let consecutiveEmpty = 0;

	for (let p = 1; p <= maxPages; p++) {
		const url = `${baseUrl}/chara_param/?page=${p}&per_page=${perPage}`;
		await page.goto(url, { waitUntil: "domcontentloaded" });

		await page.waitForTimeout(800);

		const rows = await page.$$eval(".charaListBox > li", (lis) => {
			const normalize = (s: string) => (s ?? "").replace(/[ \t\r\f\v]+/g, " ").trim();

			const textWithBr = (el: Element | null) => {
				if (!el) return "";
				const clone = el.cloneNode(true) as HTMLElement;
				clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
				return normalize(clone.textContent ?? "").replace(/ \n /g, "\n").trim();
			};

			const rubySurface = (el: Element | null) => {
				if (!el) return "";
				const clone = el.cloneNode(true) as HTMLElement;
				clone.querySelectorAll("rt").forEach((rt) => rt.remove());
				return normalize(clone.textContent ?? "");
			};

			const getMethodsFromLi = (li: Element) => {
				const results: Array<
					| { type: "single"; title: string }
					| { type: "list"; title: string; items: string[] }
					| { type: "record"; title: string; routes: Record<string, string[]> }
				> = [];

				const container = li.querySelector("dl.getTxt dd.question");
				if (!container) return results;

				const normalize = (s: string) => (s ?? "").replace(/[ \t\r\f\v]+/g, " ").trim();

				const getLiTexts = (root: Element) =>
					Array.from(root.querySelectorAll("li"))
						.map((x) => normalize(x.textContent ?? ""))
						.filter(Boolean);

				container.querySelectorAll(":scope > dl").forEach((dl) => {
					const dt = dl.querySelector("dt");
					if (!dt) return;

					const title = normalize(dt.textContent ?? "");
					if (!title) return;

					if (title === "クロニクル対戦ルート") {
						// ddが複数並ぶ（各ルートが dd 単位）
						const routes: Record<string, string[]> = {};

						dl.querySelectorAll(":scope > dd").forEach((dd) => {
							const routeName = normalize(dd.querySelector("p")?.textContent ?? "");
							if (!routeName) return;

							const battles = getLiTexts(dd);
							if (battles.length === 0) return;

							routes[routeName] = battles;
						});

						results.push({ type: "record", title, routes });
						return;
					}

					const lis = dl.querySelectorAll("dd ul li");
					if (lis.length > 0) {
						results.push({
							type: "list",
							title,
							items: Array.from(lis)
								.map((x) => normalize(x.textContent ?? ""))
								.filter(Boolean)
						});
						return;
					}

					results.push({ type: "single", title });
				});

				return results;
			};

			const statMapFromLi = (li: Element) => {
				const map: Record<string, string> = {};
				li.querySelectorAll("ul.param dl").forEach((dl) => {
					const dt = dl.querySelector("dt");
					if (!dt) return;
					const key = normalize(dt.textContent ?? "");
					if (!key) return;

					const p = dl.querySelector("dd p");
					if (p) {
						map[key] = normalize(p.textContent ?? "");
						return;
					}
					const td = dl.querySelector("dd table td");
					if (td) {
						map[key] = normalize(td.textContent ?? "");
						return;
					}
				});
				return map;
			};

			const basicMapFromLi = (li: Element) => {
				const map: Record<string, string> = {};
				li.querySelectorAll("ul.basic dl").forEach((dl) => {
					const dt = dl.querySelector("dt");
					const dd = dl.querySelector("dd");
					if (!dt || !dd) return;
					const k = normalize(dt.textContent ?? "");
					const v = normalize(dd.textContent ?? "");
					if (k) map[k] = v;
				});
				return map;
			};

			return lis.map((li) => {
				const imgUrl = (li.querySelector("picture img") as HTMLImageElement | null)?.src ?? "";
				if (imgUrl.includes("secret")) return null;
				
				const name = rubySurface(li.querySelector("div.nameBox span.name"));
				const nickname = rubySurface(li.querySelector("div.name span.nickname"));
				const appearedWorks = normalize(li.querySelector("dl.appearedWorks dd")?.textContent ?? "");
				const description = textWithBr(li.querySelector("p.description"));
				const getMethods = getMethodsFromLi(li);

				const viewHref = (li.querySelector("a.verLink") as HTMLAnchorElement | null)?.getAttribute("href") ?? "";
				const viewUrl = viewHref ? new URL(viewHref, location.origin).toString() : "";

				const stats = statMapFromLi(li);
				const basic = basicMapFromLi(li);

				return {
					name,
					nickname,
					appeared_works: appearedWorks,
					description,
					get_methods: getMethods,
					img_url: imgUrl,
					view_url: viewUrl,

					position: stats["ポジション"] === "?" ? null : (stats["ポジション"] as PlayerPosition) ?? null,
					element: stats["属性"] === "?" ? null : (stats["属性"] as PlayerElement) ?? null,
					kick: stats["キック"] ? Number(stats["キック"]) : null,
					control: stats["コントロール"] ? Number(stats["コントロール"]) : null,
					technique: stats["テクニック"] ? Number(stats["テクニック"]) : null,
					pressure: stats["プレッシャー"] ? Number(stats["プレッシャー"]) : null,
					physical: stats["フィジカル"] ? Number(stats["フィジカル"]) : null,
					agility: stats["アジリティ"] ? Number(stats["アジリティ"]) : null,
					intelligence: stats["インテリジェンス"] ? Number(stats["インテリジェンス"]) : null,

					age_group: basic["年代区分"] ?? "",
					grade: basic["学年"] ?? "",
					gender: basic["性別"] ?? "",
					category: basic["キャラカテゴリ"] ?? ""
				} satisfies Player;
			});
		});

		const valid = rows.filter((r) => r && r.name) as Player[];

		if (valid.length === 0) {
			consecutiveEmpty++;
			console.log(`page ${p}: empty (${consecutiveEmpty}/${emptyStop})`);
			if (consecutiveEmpty >= emptyStop) break;
			continue;
		}

		consecutiveEmpty = 0;
		all.push(...valid);
		console.log(`page ${p}: +${valid.length} (total ${all.length})`);
	}

	await browser.close();

	const json = JSON.stringify(
		{
			count: all.length,
			players: all
		},
		null,
		"\t"
	);
	fs.mkdirSync(path.dirname(outJson), { recursive: true });
	fs.writeFileSync(outJson, json + "\n", "utf-8");
	console.log(`saved json: ${outJson}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
