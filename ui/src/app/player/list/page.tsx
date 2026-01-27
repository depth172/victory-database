import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlayersList from "@/components/PlayersList";
import { fetchPlayersPage, filtersFromSearchParams } from "@/lib/playerFilters";
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

	const initial = await fetchPlayersPage(supabase, {
		pageSize: 100,
		cursor: null,
		filters: f,
		sort: f.sid ? { id: f.sid, dir: f.sdir ?? "desc" } : null,
	});

	const last = initial.at(-1);
	const initialCursor = last
		? {
				number: last.number!,
				sortValue: f.sid ? (last as unknown as Record<string, number | null>)[f.sid] ?? null : null,
		  }
		: null;
	
  return (
    <main style={{ padding: 16 }}>
      <h1>選手一覧</h1>
      <PlayersList initial={initial} initialCursor={initialCursor} />
    </main>
  );
}
