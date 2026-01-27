"use client";

import style from "./PlayersList.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PlayerRow } from "@/types";
import PlayerImageCell from "./PlayerImageCell";
import PositionIcon from "./icons/PositionIcon";
import ElementIcon from "./icons/ElementIcon";
import GenderIcon from "./icons/GenderIcon";
import PlayerCategoryIcon from "./icons/PlayerCategoryIcon";
import BuildIcon from "./icons/BuildIcon";
import { usePathname, useRouter, useSearchParams } from "next/dist/client/components/navigation";
import PlayersSearchForm from "./PlayersListSearchForm";
import { Filters, filtersFromSearchParams, searchParamsFromFilters } from "@/lib/playerFilters";
import { BUILD, CATEGORY, decodeFromDict, ELEMENT, GENDER, POSITION, WORK } from "@/lib/playerDict";

function applyCategoryFilter(query: ReturnType<typeof buildPlayersQuery>, catCode: string | null) {
  if (!catCode) return query;

  const targets = CATEGORY[catCode as keyof typeof CATEGORY];
  if (!targets) return query;

  // 1個なら contains 1本
  if (targets.length === 1) {
    return query.contains("category", [targets[0]]);
  }

  // 複数なら OR（監督またはコーチ）
  const orExpr = targets
    .map((t) => `category.cs.{${t}}`)
    .join(",");

  return query.or(orExpr);
}

function buildPlayersQuery(args: {
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
  cursor: number | null;
  q: string;
  w: string | null;
  pos: string | null;
  el: string | null;
  g: string | null;
  cat: string | null;
	b: string | null;
}) {
  const { supabase, cursor, q, w, pos, el, g, cat, b } = args;

  let query = supabase
    .schema("extended")
    .from("players_view")
    .select("id,number,name,ruby,nickname,appeared_works,main_build_name,img_url,position,element,age_group,grade,gender,category,affiliation")
    .order("number", { ascending: true })
    .limit(100);

  if (cursor != null) query = query.gt("number", cursor);

  if (q) {
    const esc = q.replaceAll("%", "\\%").replaceAll("_", "\\_");
    query = query.or(`name.ilike.%${esc}%,ruby.ilike.%${esc}%,nickname.ilike.%${esc}%`);
  }

  if (w) query = query.eq("appeared_works", decodeFromDict(WORK, w));
  if (pos) query = query.eq("position", decodeFromDict(POSITION, pos));
  if (el) query = query.eq("element", decodeFromDict(ELEMENT, el));
  if (g) query = query.eq("gender", decodeFromDict(GENDER, g));
  if (b) query = query.eq("main_build_name", decodeFromDict(BUILD, b));

  query = applyCategoryFilter(query, cat);

  return query;
}

export default function PlayersList(props: { initial: PlayerRow[]; initialCursor: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

	const supabase = createSupabaseBrowserClient();

	const [players, setPlayers] = useState<PlayerRow[]>(props.initial);
	const [cursor, setCursor] = useState<number | null>(props.initialCursor);
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(props.initial.length === 0);

	const sentinelRef = useRef<HTMLDivElement>(null);

  const applied: Filters = useMemo(() => {
    return filtersFromSearchParams(new URLSearchParams(sp.toString()));
  }, [sp]);

  function onApply(next: Filters) {
		setLoading(true);
		setDone(false);
    const nextSp = searchParamsFromFilters(next);
    const qs = nextSp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
	
	async function reloadByFilters(f: Filters) {
    setLoading(true);
    setDone(false);

    const { data, error } = await buildPlayersQuery({
      supabase,
      cursor: null,
      ...f,
    });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as PlayerRow[];
    setPlayers(rows);
    setCursor(rows.length ? rows.at(-1)!.number : null);
    setDone(rows.length === 0);
    setLoading(false);
  }

  // URLが変わったら（=条件が変わったら）最初から取り直す
  useEffect(() => {
    reloadByFilters(applied);
		// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

  async function loadMore() {
    if (loading || done) return;
    if (cursor == null) {
      setDone(true);
      return;
    }

    setLoading(true);

    const { data, error } = await buildPlayersQuery({
      supabase,
      cursor,
      ...applied,
    });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as PlayerRow[];
    if (rows.length === 0) {
      setDone(true);
      setLoading(false);
      return;
    }

    setPlayers((prev) => [...prev, ...rows]);
    setCursor(rows.at(-1)!.number);
    setLoading(false);
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loading, done, applied.q, applied.w, applied.pos, applied.el, applied.g, applied.cat, applied.b]);

  return (
    <div>
      <PlayersSearchForm applied={applied} onApply={onApply} loading={loading} />
			
			<div className={style.playerTableContainer}>
				<div id="player-list" className={style.playerTable}>
					<div className={style.pTableHeader}>
						<div />
						<div />
						<div>名前</div>
						<div>性別</div>
						<div>ポジション</div>
						<div>属性</div>
						<div>メインビルド</div>
						<div>カテゴリ</div>
						<div>所属</div>
					</div>
					<div className={style.playerTableBody}>
						<ul className={style.pTableSpacer}>
							{players.map((p) => (
								<li key={p.id} className={style.pTableRow}>
									<div className={style.numberCell}>
										{p.number}
										</div>
									<PlayerImageCell imgUrl={p.img_url} name={p.name} />
									<Link href={`/player/${encodeURIComponent(p.id)}`}>
										<span className={style.name}>{p.name}</span><br />
										<span className={style.nickname}>({p.nickname ?? " - "})</span>
									</Link>
									<div className={style.iconCell}>
										<GenderIcon gender={p.gender} size={20} />
									</div>
									<div className={style.iconCell}>
										<PositionIcon position={p.position ?? ""} size={18} />
									</div>
									<div className={style.iconCell}>
										<ElementIcon element={p.element ?? ""} size={24} />
									</div>
									<div className={style.buildCell}>
										<BuildIcon build={p.main_build_name ?? ""} size={28} />
										{p.main_build_name ?? "調査中"}
									</div>
									<div className={style.categoryCell}>
										{p.category.map((c) => (
											<div key={`${p.id}-${c}`} className={style.categoryItem}><PlayerCategoryIcon category={c} size={18} />{c}</div>
										))}
									</div>
									<div className={style.affiliationCell}>
										{p.affiliation[0] ?? " - "}
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      <div style={{ padding: 12, opacity: 0.8 }}>
        {done ? "ここまで" : loading ? "読み込み中…" : ""}
      </div>
    </div>
  );
}
