import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlayersList from "@/components/PlayersList";
import { PlayerRow } from "@/types";
import { filtersFromSearchParams } from "@/lib/playerFilters";
import { BUILD, /* CATEGORY, */ decodeFromDict, ELEMENT, GENDER, POSITION, WORK } from "@/lib/playerDict";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "選手一覧 - Victory Database",
	description: "Victory Databaseの選手一覧ページです。",
};

// function escapeLike(s: string) {
//   // ilike の % _ をざっくりエスケープ
//   return s.replaceAll("%", "\\%").replaceAll("_", "\\_");
// }

type SP = Record<string, string | string[] | undefined>;

export default async function PlayersPage(
  props: { searchParams: Promise<SP> }
) {
  const searchParams = await props.searchParams;
  
  const supabase = createSupabaseServerClient();

  const f = filtersFromSearchParams(new URLSearchParams(Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v ?? ""])));

	const { data, error } = await supabase.rpc("get_players_page_focus_at_asc", {
		page_size: 100,
		last_focus_at: null,
		last_number: null,

		q: f.q ?? null,
		w: f.w ? decodeFromDict(WORK, f.w) : null,
		pos: f.pos ? decodeFromDict(POSITION, f.pos) : null,
		el: f.el ? decodeFromDict(ELEMENT, f.el) : null,
		g: f.g ? decodeFromDict(GENDER, f.g) : null,
		b: f.b ? decodeFromDict(BUILD, f.b) : null,

		// cat はいったん後回しでもいい（最初は動かすのが優先）
	});

  // if (f.cat) {
	// 	const targets = CATEGORY[f.cat as keyof typeof CATEGORY];
	// 	if (targets) {
	// 		if (targets.length === 1) {
	// 			query = query.contains("category", [targets[0]]);
	// 		} else {
	// 			const orExpr = targets
	// 				.map((t) => `category.cs.{${t}}`)
	// 				.join(",");
	// 			query = query.or(orExpr);
	// 		}
	// 	}
	// }

  if (error) {
    return <div>読み込み失敗: {error.message}</div>;
  }

	const initial = (data ?? []) as PlayerRow[];
	const last = initial.at(-1);
	const initialCursor =
		last ? { focusAt: last.focus_at as number, number: last.number } : null;
	
  return (
    <main style={{ padding: 16 }}>
      <h1>選手一覧</h1>
      <PlayersList initial={initial} initialCursor={initialCursor} />
    </main>
  );
}
