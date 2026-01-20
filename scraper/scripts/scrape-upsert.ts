import "dotenv/config";
import * as cheerio from "cheerio";
import type { Player, PlayerElement, PlayerPosition } from "@/shared/types";

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

	console.log("Building list map from chara_list...");

	for (let p = 1; p <= maxPages; p++) {
		console.log(`  page ${p}...`);

		const url = `${baseUrl}/chara_list/?page=${p}&per_page=${perPage}`;
		const html = await fetch(url).then((r) => r.text());
		const $ = cheerio.load(html);

		const table = $("table")
			.filter((_, el) => normalize($(el).text()).includes("No"))
			.first();

		if (table.length === 0) {
			break;
		}

		const rows = table.find("tbody tr");
		if (rows.length === 0) break;

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

		if (hit === 0) break;
	}

	return map;
}

async function uploadToDatabase(players: Player[]) {
	const apiUrl = process.env.API_URL_INGEST!;
	const ingestKey = process.env.INGEST_KEY!;
	const supabaseKey = process.env.SUPABASE_ANON_KEY!;
	const batchSize = Number(process.env.UPSERT_BATCH_SIZE ?? "200");

	console.log(new URL(apiUrl).origin);
	console.log(`Using Supabase Key: ${supabaseKey ? "*****" : "(not set)"}`);
	console.log(`Using Ingest Key: ${ingestKey ? "*****" : "(not set)"}`);

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
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
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
        }
      } else {
        console.error(`  ✗ Batch ${batchNum} failed: ${data.error}`);
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

async function main() {
  const baseUrl = getArg("--base") ?? "https://zukan.inazuma.jp";
  const perPage = Number(getArg("--per-page") ?? "200");
  const maxPages = Number(getArg("--max-pages") ?? "999");
  const emptyStop = Number(getArg("--empty-stop") ?? "5");

  const all: Player[] = [];
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

      rows.push({
				id: q && listMap.has(q) ? listMap.get(q)!.id : "",
				number: q && listMap.has(q) ? listMap.get(q)!.number : null,
        name,
				ruby: q && listMap.has(q) ? listMap.get(q)!.ruby : "",
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
        category: q && listMap.has(q) ? listMap.get(q)!.category : [],
				affiliation: q && listMap.has(q) ? listMap.get(q)!.affiliation : []
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
    all.push(...filtered);

    console.log(`  got ${filtered.length} players (total: ${all.length})`);
  }

	await uploadToDatabase(all);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
