import "dotenv/config";
import crypto from "crypto";
import * as cheerio from "cheerio";
import type { Player, PlayerElement, PlayerPosition, SpecialMove } from "@/shared/types";

function getArg(name: string): string | null {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

const normalize = (s: string) => (s ?? "").replace(/[ \t\r\f\v]+/g, " ").trim();

function textWithBr($: cheerio.CheerioAPI, root: cheerio.Cheerio<any> | null): string {
  if (!root || root.length === 0) return "";
  // brを\nにしたいのでhtmlを拾って置換するのが楽
  const html = root.html() ?? "";
  const withNewlines = html.replace(/<br\s*\/?>/gi, "\n");
  const tmp = cheerio.load(`<div>${withNewlines}</div>`);
  return normalize(tmp("div").text()).replace(/ \n /g, "\n").trim();
}

function rubySurface($: cheerio.CheerioAPI, root: cheerio.Cheerio<any> | null): string {
  if (!root || root.length === 0) return "";
  // rtを消してからtext
  const cloned = cheerio.load(`<div>${root.html() ?? ""}</div>`);
  cloned("rt").remove();
  return normalize(cloned("div").text());
}

function statMapFromLi($: cheerio.CheerioAPI, li: cheerio.Cheerio<any>) {
  const map: Record<string, string> = {};
  li.find("ul.param dl").each((_, dl) => {
    const $dl = $(dl);
    const key = normalize($dl.find("dt").first().text());
    if (!key) return;

    const p = $dl.find("dd p").first();
    if (p.length) {
      map[key] = normalize(p.text());
      return;
    }
    const td = $dl.find("dd table td").first();
    if (td.length) {
      map[key] = normalize(td.text());
      return;
    }
  });
  return map;
}

function basicMapFromLi($: cheerio.CheerioAPI, li: cheerio.Cheerio<any>) {
  const map: Record<string, string> = {};
  li.find("ul.basic dl").each((_, dl) => {
    const $dl = $(dl);
    const k = normalize($dl.find("dt").first().text());
    const v = normalize($dl.find("dd").first().text());
    if (k) map[k] = v;
  });
  return map;
}

type ListItem = {
	id: string;
	number: number | null;
	ruby: string;
	category: string[];
	affiliation: string[];
};

function resolveColumnIndex($: cheerio.CheerioAPI, table: cheerio.Cheerio<any>) {
	const map = new Map<string, number>();

	table.find("thead tr").first().find("th").each((i, el) => {
		const label = normalize($(el).text());
		if (!label) return;
		map.set(label, i);
	});

	return map;
}

function findIndex(map: Map<string, number>, candidates: string[]) {
	// 完全一致
  for (const [label, idx] of map.entries()) {
    if (candidates.includes(label)) return idx;
  }
	// 部分一致
  for (const [label, idx] of map.entries()) {
    if (candidates.some((c) => label.includes(c))) return idx;
  }
	return undefined;
}

function tdLines($: cheerio.CheerioAPI, td: cheerio.Cheerio<any>): string[] {
	if (!td || td.length === 0) return [];

	// brを改行にしてからテキスト化
	const html = td.html() ?? "";
	const withNewlines = html.replace(/<br\s*\/?>/gi, "\n");
	const tmp = cheerio.load(`<div>${withNewlines}</div>`);
	const text = tmp("div").text();

	return text
		.split("\n")
		.map((x) => normalize(x))
		.filter(Boolean);
}

async function buildMapFromCharaList(baseUrl: string) {
	const map = new Map<string, ListItem>();

	const perPage = 200;
	const maxPages = 999;
	const maxConsecutiveEmpty = 5; // 連続で無データなページが5回続いたら止める

	console.log("Building list map from chara_list...");

	let consecutiveEmpty = 0;

	for (let p = 1; p <= maxPages; p++) {
		const url = `${baseUrl}/chara_list/?page=${p}&per_page=${perPage}`;
		const html = await fetch(url).then((r) => r.text());
		const $ = cheerio.load(html);

		const table = $("table")
			.filter((_, el) => normalize($(el).text()).includes("No"))
			.first();

		if (table.length === 0) {
			consecutiveEmpty++;
			console.log(`  page ${p}: no table found (${consecutiveEmpty}/${maxConsecutiveEmpty})`);
			if (consecutiveEmpty >= maxConsecutiveEmpty) {
				console.log(`  stopping after ${maxConsecutiveEmpty} consecutive empty pages`);
				break;
			}
			continue;
		}

		const rows = table.find("tbody tr");
		if (rows.length === 0) {
			consecutiveEmpty++;
			console.log(`  page ${p}: no tbody rows (${consecutiveEmpty}/${maxConsecutiveEmpty})`);
			if (consecutiveEmpty >= maxConsecutiveEmpty) {
				console.log(`  stopping after ${maxConsecutiveEmpty} consecutive empty pages`);
				break;
			}
			continue;
		}

		const colIndexMap = resolveColumnIndex($, table);
		
		const noIndex = findIndex(colIndexMap, ["No"]);
		const nameIndex = findIndex(colIndexMap, ["名前"]);
		const categoryIndex = findIndex(colIndexMap, ["カテゴリ"]);
		const affiliationIndex = findIndex(colIndexMap, ["チーム"]);

		let hit = 0;

		rows.each((_, el) => {
			const row = $(el);

			const href =
				row.find('a[href*="chara_model_view"]').attr("href") ??
				row.find('a[href*="chara_model"]').attr("href") ??
				"";
			if (!href) return;

			const q = new URL(href, baseUrl).searchParams.get("q");
			if (!q) return;

			const tds = row.find("td");

			const nameTd = nameIndex !== undefined ? tds.eq(nameIndex) : null;
			const nameHref = nameTd ? nameTd.find("div.nameBox p a").attr("href") : null;
			const id = nameHref ? new URL(nameHref, baseUrl).searchParams.get("q") as string : "";

			const ruby = nameTd ? nameTd.find("div.nameBox p a span.rubi").text() : "";

			const noText = noIndex !== undefined ? normalize(tds.eq(noIndex).text()) : "";
			const no = noText ? Number(noText) : null;

			const category = categoryIndex !== undefined ? tdLines($, tds.eq(categoryIndex)) : [];
			const affiliation = affiliationIndex !== undefined ? tdLines($, tds.eq(affiliationIndex)) : [];

			map.set(q, { id, ruby, number: no, category, affiliation });
			hit++;
		});

		if (hit === 0) {
			consecutiveEmpty++;
			console.log(`  page ${p}: no hits (${consecutiveEmpty}/${maxConsecutiveEmpty})`);
			if (consecutiveEmpty >= maxConsecutiveEmpty) {
				console.log(`  stopping after ${maxConsecutiveEmpty} consecutive empty pages`);
				break;
			}
		} else {
			consecutiveEmpty = 0; // リセット
			console.log(`  page ${p}: ${hit} entries added (total: ${map.size})`);
		}
	}

	return map;
}

async function uploadToPlayerDatabase(players: Player[]) {
	const apiUrl = process.env.API_URL_INGEST!;
	const ingestKey = process.env.INGEST_KEY!;
	const batchSize = Number(process.env.UPSERT_BATCH_SIZE ?? "200");

  if (!ingestKey) {
    throw new Error("INGEST_KEY environment variable is not set");
  }

  console.log(`\nUploading ${players.length} players to database in batches of ${batchSize}...`);

  let totalUpserted = 0;
  let totalInvalid = 0;
  let failedBatches = 0;

  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(players.length / batchSize);

    console.log(`\n[Batch ${batchNum}/${totalBatches}] Uploading ${batch.length} players...`);

    try {
      const res = await fetch(apiUrl + "ingest-players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ingest-key": ingestKey,
        },
        body: JSON.stringify(batch),
      });

      const data = await res.json();

      if (res.status === 200 && data.ok) {
        console.log(`  ✓ Upserted ${data.upserted} players`);
        totalUpserted += data.upserted;

        if (data.invalid && data.invalid.length > 0) {
          console.log(`  ⚠ ${data.invalidCount} players were invalid`);
          totalInvalid += data.invalidCount;
					console.log('    Invalid IDs: %o', data.invalid.map((p: any) => p));
        }
      } else {
        console.error(`  ✗ Batch ${batchNum} failed: ${data.error}`);
				if (data.debug) console.error('    Debug: %s', data.debug);
        if (data.details) console.error('    Details: %o', data.details);
        failedBatches++;
        continue;
      }
    } catch (e) {
      console.error(`  ✗ Network error in batch ${batchNum}: ${e}`);
      failedBatches++;
      continue;
    }

    // API レート制限対策
    if (i + batchSize < players.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✓ Upload complete!`);
  console.log(`  Total upserted: ${totalUpserted}`);
  if (totalInvalid > 0) {
    console.log(`  ⚠ Total invalid: ${totalInvalid}`);
  }
  if (failedBatches > 0) {
    console.log(`  ✗ Failed batches: ${failedBatches}`);
  }
  console.log(`${'='.repeat(50)}`);

  // 全バッチ失敗した場合のみ終了コード1
  if (failedBatches > 0 && totalUpserted === 0) {
    process.exit(1);
  }
}

function hashSkill(input: string) {
  return crypto
    .createHash("sha1")
    .update(input)
    .digest("hex");
}

async function uploadToSpecialMoveDatabase(specialMoves: SpecialMove[]) {
	const apiUrl = process.env.API_URL_INGEST!;
	const ingestKey = process.env.INGEST_KEY!;
	const batchSize = Number(process.env.UPSERT_BATCH_SIZE ?? "200");

	if (!ingestKey) {
			throw new Error("INGEST_KEY environment variable is not set");
	}

	console.log(`\nUploading ${specialMoves.length} special moves to database in batches of ${batchSize}...`);
	let totalUpserted = 0;
	let failedBatches = 0;

	for (let i = 0; i < specialMoves.length; i += batchSize) {
		const batch = specialMoves.slice(i, i + batchSize);
		const batchNum = Math.floor(i / batchSize) + 1;
		const totalBatches = Math.ceil(specialMoves.length / batchSize);
		console.log(`\n[Batch ${batchNum}/${totalBatches}] Uploading ${batch.length} special moves...`);

		try {
			const res = await fetch(apiUrl + "ingest-special-moves", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-ingest-key": ingestKey,
				},
				body: JSON.stringify(batch),
			});
			const data = await res.json();

			if (res.status === 200 && data.ok) {
				console.log(`  ✓ Upserted ${data.upserted} special moves`);
				totalUpserted += data.upserted;
			} else {
				console.error(`  ✗ Batch ${batchNum} failed: ${data.error ?? "unknown error"}`);
				if (data.debug) console.error('    Debug: %s', data.debug);
				if (data.details) console.error('    Details: %o', data.details);
				failedBatches++;
				continue;
			}
		} catch (e) {
			console.error(`  ✗ Network error in batch ${batchNum}: ${e}`);
			failedBatches++;
			continue;
		}
		// API レート制限対策
		if (i + batchSize < specialMoves.length) {
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}

	console.log(`\n${'='.repeat(50)}`);
	console.log(`✓ Upload complete!`);
	console.log(`  Total upserted: ${totalUpserted}`);
	if (failedBatches > 0) {
		console.log(`  ✗ Failed batches: ${failedBatches}`);
	}
	console.log(`${'='.repeat(50)}`);

	// 全バッチ失敗した場合のみ終了コード1
	if (failedBatches > 0 && totalUpserted === 0) {
		process.exit(1);
	}
}

async function main() {
  const baseUrl = getArg("--base") ?? "https://zukan.inazuma.jp";
  const perPage = Number(getArg("--per-page") ?? "200");
  const maxPages = Number(getArg("--max-pages") ?? "999");
  const emptyStop = Number(getArg("--empty-stop") ?? "5");

  const allPlayers: Player[] = [];
  let consecutiveEmpty = 0;

	const listMap = await buildMapFromCharaList(baseUrl);
	console.log(`built list map with ${listMap.size} entries` + "\n");

  for (let p = 1; p <= maxPages; p++) {
    const url = `${baseUrl}/chara_param/?page=${p}&per_page=${perPage}`;

		console.log(`Fetching page ${p}...`);

    const res = await fetch(url, {
      headers: {
        // たまにUAで挙動変わるサイトがあるので保険
        "user-agent": "Mozilla/5.0 (scraper; +cheerio)"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    const html = await res.text();

    const $ = cheerio.load(html);

    const rows: Array<Omit<Player, "build">> = [];
    let unknownCount = 0;
    $(".charaListBox > li").each((_, el) => {
      const li = $(el);

      const imgUrl =
        li.find("picture img").attr("src") ??
        li.find("picture img").attr("data-src") ?? // 遅延ロード保険
        "";

      if (imgUrl.includes("secret")) return;

      const name = rubySurface($, li.find("div.nameBox span.name").first());
      const nickname = rubySurface($, li.find("div.name span.nickname").first());
      const appearedWorks = normalize(li.find("dl.appearedWorks dd").first().text());
      const description = textWithBr($, li.find("p.description").first());

      const viewHref = li.find("a.verLink").attr("href") ?? "";
      const viewUrl = viewHref ? new URL(viewHref, baseUrl).toString() : "";
			const q = new URL(viewUrl).searchParams.get("q");

      const stats = statMapFromLi($, li);
      const basic = basicMapFromLi($, li);

			const listItem = q ? listMap.get(q) : undefined;
			if (!q || !listItem) {
				unknownCount++;
				console.log(`  ⚠ Unknown player #${unknownCount}: name="${name}" q="${q}" in_listMap=${q ? listMap.has(q) : false}`);
				return;
			}

			const id = listItem.id;

      rows.push({
				id,
				number: listItem.number,
        name,
				ruby: listItem.ruby,
        nickname,
        appeared_works: appearedWorks,
        description,
        get_methods: [], // ここは後で移植（長いから一旦空でもOK）
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
        category: listItem.category,
				affiliation: listItem.affiliation
      });
    });

    const filtered = rows.filter((r) => r && r.name)

		if (filtered.length === 0) {
      consecutiveEmpty++;
      console.log(`  page ${p} was empty (${consecutiveEmpty}/${emptyStop})`);
      if (consecutiveEmpty >= emptyStop) break;
      continue;
    }

    consecutiveEmpty = 0;
    allPlayers.push(...filtered);

    console.log(`  got ${filtered.length} players (${unknownCount} unknown, total: ${allPlayers.length})`);
  }

	await uploadToPlayerDatabase(allPlayers);

	const allSpecialMoves: SpecialMove[] = [];
	let numberCounter = 0;

	console.log(`\nFetching special moves from ${baseUrl}/skill/...`);

	const shootQuery = "hN2cnouamJCNhqCZlpOLmo3dxaTOooI=";
	const offenseQuery = "hN2cnouamJCNhqCZlpOLmo3dxaTNooI=";
	const defenseQuery = "hN2cnouamJCNhqCZlpOLmo3dxaTMooI=";
	const keeperQuery = "hN2cnouamJCNhqCZlpOLmo3dxaTLooI=";

	const skillTypeNames = {
		シュート: "shoot",
		オフェンス: "offense",
		ディフェンス: "defense",
		キーパー: "keeper",
	} as const;

	for (const [category, query] of [
		["シュート", shootQuery],
		["オフェンス", offenseQuery],
		["ディフェンス", defenseQuery],
		["キーパー", keeperQuery],
	] as const) {
		for (let p = 1; p <= maxPages; p++) {
			const url = `${baseUrl}/skill/?page=${p}&q=${query}`;
			console.log(`  fetching ${skillTypeNames[category]} skills... (page ${p})`);

			const res = await fetch(url, {
				headers: {
					// たまにUAで挙動変わるサイトがあるので保険
					"user-agent": "Mozilla/5.0 (scraper; +cheerio)"
				}
			});

			if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
			const html = await res.text();
			
			const rows: SpecialMove[] = [];

			const $ = cheerio.load(html);
			$("ul.skillListBox > li").each((idx, el) => {
				const li = $(el);

				const name = rubySurface($, li.find("span.name").first());
				const description = textWithBr($, li.find("p.description").first());

				const movieHref = li.find("a.modal_inline").attr("data-movie-url") ?? "";
				const rawId = name + "|" + movieHref;
				const id = hashSkill(rawId);

				numberCounter++;

				if (!name || name === "？？？") return;

				rows.push({
					id,
					number: numberCounter,
					name,
					description,
					movie_url: movieHref,
					category,
				});
			});

			if (rows.length === 0) {
				break;
			}

			allSpecialMoves.push(...rows);

			console.log(`    got ${rows.length} special moves (total: ${allSpecialMoves.length})`);
		}
	}

	await uploadToSpecialMoveDatabase(allSpecialMoves);

	console.log("\nAll done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
