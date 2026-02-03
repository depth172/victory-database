import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlayersList from "@/components/PlayersList";
import { Metadata } from "next";
import style from "./Page.module.css"
import { fetchSkillsPage } from "@/lib/skillFilter";
import SkillList from "@/components/SkillList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "必殺技一覧 - Victory Database",
	description: "Victory Databaseの必殺技一覧ページです。",
};

export default async function PlayersPage() {
  const supabase = createSupabaseServerClient();

	const initial = await fetchSkillsPage(supabase, {
		pageSize: 100,
		cursor: null,
		filters: {q: null, e: null, c: null, sid: null, sdir: null},
		sort: null,
	});

	const last = initial.at(-1);
	const initialCursor = last
		? {
				playerId: last.id,
				sortValue: null,
		  }
		: null;
	
  return (
    <main className={style.main}>
			<h1 className={style.title}>必殺技一覧</h1>
			<SkillList initialItems={initial} />
    </main>
  );
}
