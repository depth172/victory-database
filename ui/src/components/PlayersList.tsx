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
import Image from "next/image";

function LoadingSpinner() {
	return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="#d6d6d6">
		<circle cx="12" cy="2" r="2" opacity=".1">
			<animate attributeName="opacity" from="1" to=".1" dur="1s" repeatCount="indefinite" begin="0"/>
		</circle>
		<circle transform="rotate(45 12 12)" cx="12" cy="2" r="2" opacity=".1">
			<animate attributeName="opacity" from="1" to=".1" dur="1s" repeatCount="indefinite" begin=".125s"/>
		</circle>
		<circle transform="rotate(90 12 12)" cx="12" cy="2" r="2" opacity=".1">
			<animate attributeName="opacity" from="1" to=".1" dur="1s" repeatCount="indefinite" begin=".25s"/>
		</circle>
		<circle transform="rotate(135 12 12)" cx="12" cy="2" r="2" opacity=".1">
			<animate attributeName="opacity" from="1" to=".1" dur="1s" repeatCount="indefinite" begin=".375s"/>
		</circle>
		<circle transform="rotate(180 12 12)" cx="12" cy="2" r="2" opacity=".1">
			<animate attributeName="opacity" from="1" to=".1" dur="1s" repeatCount="indefinite" begin=".5s"/>
		</circle>
		<circle transform="rotate(225 12 12)" cx="12" cy="2" r="2" opacity=".1">
			<animate attributeName="opacity" from="1" to=".1" dur="1s" repeatCount="indefinite" begin=".625s"/>
		</circle>
		<circle transform="rotate(270 12 12)" cx="12" cy="2" r="2" opacity=".1">
			<animate attributeName="opacity" from="1" to=".1" dur="1s" repeatCount="indefinite" begin=".75s"/>
		</circle>
			<circle transform="rotate(315 12 12)" cx="12" cy="2" r="2" opacity=".1">
				<animate attributeName="opacity" from="1" to=".1" dur="1s" repeatCount="indefinite" begin=".875s"/>
		</circle>
	</svg>;
}

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
	const skipNextReloadRef = useRef(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const applied: Filters = useMemo(() => {
    return filtersFromSearchParams(new URLSearchParams(sp.toString()));
  }, [sp]);

  function onApply(next: Filters) {
    skipNextReloadRef.current = true; // useEffect での reload をスキップ
    reloadByFilters(next);
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
    loadingRef.current = true;
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
    setDone(rows.length < 100);
    setLoading(false);
    loadingRef.current = false;
  }

  useEffect(() => {
    if (skipNextReloadRef.current) {
      skipNextReloadRef.current = false;
      return;
    }

		reloadByFilters(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

	async function loadMore() {
		if (loadingRef.current || done || !cursor) {
			return;
		}

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
  }, [cursor, applied]);

  function handleMouseEnter(playerNumber: number) {
    const rows = document.querySelectorAll(`[data-player-id="${playerNumber}"]`);
    rows.forEach(row => row.classList.add(style.pTableRowHovered));
  }

  function handleMouseLeave(playerNumber: number) {
    const rows = document.querySelectorAll(`[data-player-id="${playerNumber}"]`);
    rows.forEach(row => row.classList.remove(style.pTableRowHovered));
  }

  return (
    <div className={style.playersListContainer}>
      <PlayersSearchForm applied={applied} onApply={onApply} loading={loading} />

      <div className={style.playerTableScrollArea}>
				<div className={style.playerTables}>
					{players.length === 0 && !loading ? (
						<div className={style.noResults}>該当する選手が見つかりませんでした。</div>
					) : (
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
											<Link href={`/player/${encodeURIComponent(p.player_id)}`}>
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
												{p.affiliation_primary_emblem_url && (
													<Image
														src={p.affiliation_primary_emblem_url}
														alt={`${p.affiliation_primary_name} エンブレム`}
														width={32}
														height={32}
														className={style.affiliationEmblem}
													/>
												)}
												{p.affiliation_primary_name}
											</div>
										</li>
									))}
								</ul>
							</div>
						</div>
					)}
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

      {players.length > 0 && (
			<div className={style.loadingArea}>
        {done ? <div className={style.loadingText}>リストはこれで全てです。</div> : <LoadingSpinner />}
      </div>
			)}
    </div>
  );
}
