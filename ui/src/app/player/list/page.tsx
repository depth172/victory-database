import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlayersList from "@/components/PlayersList";
import { PlayerRow } from "@/types";
import { filtersFromSearchParams } from "@/lib/playerFilters";
import { BUILD, CATEGORY, decodeFromDict, ELEMENT, GENDER, POSITION, WORK } from "@/lib/playerDict";

export const dynamic = "force-dynamic";

function escapeLike(s: string) {
  // ilike の % _ をざっくりエスケープ
  return s.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

type SP = Record<string, string | string[] | undefined>;

export default async function PlayersPage(
  props: { searchParams: Promise<SP> }
) {
  const searchParams = await props.searchParams;
  
  const supabase = createSupabaseServerClient();

  const f = filtersFromSearchParams(new URLSearchParams(Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v ?? ""])));

  let query = supabase
    .schema("extended")
    .from("players_view")
    .select(
      "id,number,name,ruby,nickname,appeared_works,img_url,position,element,age_group,grade,gender,category,affiliation,main_build_name"
    )
    .order("number", { ascending: true })
    .limit(100);

  // 検索（name/ruby/nickname の部分一致OR）
  if (f.q) {
    const esc = escapeLike(f.q);
    query = query.or(
      `name.ilike.%${esc}%,ruby.ilike.%${esc}%,nickname.ilike.%${esc}%`
    );
  }

  // 絞り込み
  if (f.w) query = query.eq("appeared_works", decodeFromDict(WORK, f.w));
  if (f.pos) query = query.eq("position", decodeFromDict(POSITION, f.pos));
  if (f.el) query = query.eq("element", decodeFromDict(ELEMENT, f.el));
  if (f.g) query = query.eq("gender", decodeFromDict(GENDER, f.g));
	if (f.b) query = query.eq("main_build_name", decodeFromDict(BUILD, f.b));

  if (f.cat) {
		const targets = CATEGORY[f.cat as keyof typeof CATEGORY];
		if (targets) {
			if (targets.length === 1) {
				query = query.contains("category", [targets[0]]);
			} else {
				const orExpr = targets
					.map((t) => `category.cs.{${t}}`)
					.join(",");
				query = query.or(orExpr);
			}
		}
	}

  const { data, error } = await query;

  if (error) {
    return <div>読み込み失敗: {error.message}</div>;
  }

  const initial = (data ?? []) as PlayerRow[];
  const lastNumber = initial.at(-1)?.number ?? null;

  return (
    <main style={{ padding: 16 }}>
      <h1>選手一覧</h1>
      <PlayersList initial={initial} initialCursor={lastNumber} />
    </main>
  );
}
