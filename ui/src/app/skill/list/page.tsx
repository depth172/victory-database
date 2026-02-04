import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import style from "./Page.module.css"
import { fetchSkillsPage, filtersFromSearchParams } from "@/lib/skillFilter";
import SkillList from "@/components/SkillList";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "必殺技一覧 - Victory Database",
	description: "Victory Databaseの必殺技一覧ページです。",
};

type SP = Record<string, string | string[] | undefined>;

export default async function SkillsPage(
	props: { searchParams: Promise<SP> }
) {
	const searchParams = await props.searchParams;
	
	const supabase = createSupabaseServerClient();

	const f = filtersFromSearchParams(new URLSearchParams(Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v ?? ""])));

	const initial = await fetchSkillsPage(supabase, {
		pageSize: 60,
		cursor: null,
		filters: f
	});

	const last = initial.at(-1);
	const initialCursor = last
		? {
				number: last.number!,
				skillId: last.id,
				sortValue: f.sid ? (last as unknown as Record<string, number | null>)[f.sid] ?? null : null,
			}
		: null;
	
  return (
    <main className={style.main}>
			<Link href="/" className={style.topLink}>&lt; トップに戻る</Link>
			<h1 className={style.title}>必殺技一覧</h1>
			<SkillList initialItems={initial} initialCursor={initialCursor} />
    </main>
  );
}
