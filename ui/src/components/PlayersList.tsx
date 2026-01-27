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
import {
  Cursor,
  fetchPlayersPage,
  Filters,
  filtersFromSearchParams,
  searchParamsFromFilters,
} from "@/lib/playerFilters";
import { SORTS } from "@/lib/playerDict";

export default function PlayersList(props: { initial: PlayerRow[]; initialCursor: Cursor }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const supabase = createSupabaseBrowserClient();

  const [players, setPlayers] = useState<PlayerRow[]>(props.initial);
  const [cursor, setCursor] = useState<Cursor>(props.initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(props.initial.length === 0);

	const loadingRef = useRef(false);

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

  // 共通：fetch → cursor を作る
  function makeCursor(rows: PlayerRow[], f: Filters): Cursor {
    if (rows.length === 0) return null;
    const last = rows.at(-1)!;

    return {
      number: last.number!,
      sortValue: f.sid ? (last as unknown as Record<string, number | null>)[f.sid] ?? null : null,
    };
  }

  async function reloadByFilters(f: Filters) {
    setLoading(true);
    setDone(false);

    const rows = await fetchPlayersPage(supabase, {
      pageSize: 100,
      cursor: null,
      filters: f,
      sort: f.sid ? { id: f.sid, dir: f.sdir ?? "desc" } : null,
    });

    setPlayers(rows);
    setCursor(makeCursor(rows, f));
    setDone(rows.length === 0);
    setLoading(false);
  }

  useEffect(() => {
    reloadByFilters(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

	async function loadMore() {
		if (loadingRef.current || done || !cursor) return;

		loadingRef.current = true;
		setLoading(true);

		try {
			const rows = await fetchPlayersPage(supabase, {
				pageSize: 100,
				cursor,
				filters: applied,
				sort: applied.sid ? { id: applied.sid, dir: applied.sdir ?? "desc" } : null,
			});

			if (rows.length === 0) {
				setDone(true);
				return;
			}

			// ここで重複を弾く（保険）
			setPlayers((prev) => {
				const seen = new Set(prev.map((p) => p.number));
				const next = rows.filter((r) => !seen.has(r.number));
				return [...prev, ...next];
			});

			setCursor(makeCursor(rows, applied));
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
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
  }, [cursor, loading, done, applied]);

  function handleMouseEnter(playerNumber: number) {
    const rows = document.querySelectorAll(`[data-player-id="${playerNumber}"]`);
    rows.forEach(row => row.classList.add(style.pTableRowHovered));
  }

  function handleMouseLeave(playerNumber: number) {
    const rows = document.querySelectorAll(`[data-player-id="${playerNumber}"]`);
    rows.forEach(row => row.classList.remove(style.pTableRowHovered));
  }

  return (
    <div>
      <PlayersSearchForm applied={applied} onApply={onApply} loading={loading} />

      <div className={style.playerTableScrollArea}>
				<div className={style.playerTables}>
					<div id="player-list" className={style.playerTable}>
						<div className={style.pTableHeader}>
							<div />
							<div className={style.iconHeader} />
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
									<li key={p.number}
										data-player-id={p.number}
										className={style.pTableRow}
										onMouseEnter={() => handleMouseEnter(p.number)}
										onMouseLeave={() => handleMouseLeave(p.number)}
									>
										<div className={style.numberCell}>{p.number}</div>
										<PlayerImageCell imgUrl={p.img_url} name={p.name} />
										<Link href={`/player/${encodeURIComponent(p.number)}`}>
											<span className={style.name}>{p.name}</span>
											<br />
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
												<div key={`${p.number}-${c}`} className={style.categoryItem}>
													<PlayerCategoryIcon category={c} size={18} />
													{c}
												</div>
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
					{applied.sid && (
						<div className={style.numberTable}>
							<div className={style.nTableHeader}>
								<div>{SORTS[applied.sid]}</div>
							</div>
							<div className={style.numberTableBody}>
								<ul className={style.nTableSpacer}>
									{players.map((p) => (
										<li 
											key={`ntable-${p.number}`}
											data-player-id={p.number}
											className={style.nTableRow}
											onMouseEnter={() => handleMouseEnter(p.number)}
											onMouseLeave={() => handleMouseLeave(p.number)}
										>
											{(p as unknown as Record<string, number | null>)[applied.sid!] ?? " - "}
										</li>
									))}
								</ul>
							</div>
						</div>
					)}
				</div>
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      <div style={{ padding: 12, opacity: 0.8 }}>
        {done ? "ここまで" : loading ? "読み込み中…" : ""}
      </div>
    </div>
  );
}
