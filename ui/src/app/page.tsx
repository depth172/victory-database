"use client";

import Image from "next/image";
import style from "./page.module.css";
import { getPlayers } from "@/../lib/players";
import { useCallback, useMemo, useState, useRef, memo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Player, PlayerElement, PlayerPosition } from "@shared/types";
import { createPortal } from "react-dom";

type Stats = "kick" | "control" | "technique" | "pressure" | "physical" | "agility" | "intelligence";
export type SpecificStats = "focus_at" | "focus_df" | "scramble_at" | "scramble_df" | "shoot" | "wall" | "keep";

const specificStatsToStatsMap: Record<SpecificStats, Stats[]> = {
	"focus_at": ["kick", "control", "technique"],
	"focus_df": ["technique", "agility", "intelligence"],
	"scramble_at": ["intelligence", "physical"],
	"scramble_df": ["intelligence", "pressure"],
	"shoot": ["kick", "control"],
	"wall": ["pressure", "physical"],
	"keep": ["pressure", "physical", "agility"]
};

const statsToDisplayName: Record<Stats, string> = {
	"kick": "キック",
	"control": "コントロール",
	"technique": "テクニック",
	"pressure": "プレッシャー",
	"physical": "フィジカル",
	"agility": "アジリティ",
	"intelligence": "インテリジェンス"
};

const specificStatsToDisplayName: Record<SpecificStats, string> = {
	"focus_at": "フォーカスAT",
	"focus_df": "フォーカスDF",
	"scramble_at": "スクランブルAT",
	"scramble_df": "スクランブルDF",
	"shoot": "シュートAT",
	"wall": "城壁DF",
	"keep": "KP"
};

type SortOption = "asc" | "desc" | null;

type FilterState = {
	element: PlayerElement[];
	gender: string[];
	position: PlayerPosition[];
	sort: {
		[key in Stats | SpecificStats]?: SortOption;
	};
};

export type PreparedRow = {
	player: Player;
	total: number;
	specificTotals: Record<SpecificStats, number>;
};

type SortRule =
	| { kind: "stat"; key: Stats; dir: 1 | -1 }
	| { kind: "specific"; key: SpecificStats; dir: 1 | -1 };

export default function PlayersPage() {
	const players = useMemo(() => getPlayers(), []);

	const [currentFilter, setCurrentFilter] = useState<FilterState>({
		element: [],
		gender: [],
		position: [],
		sort: {}
	});

	const [editingFilter, setEditingFilter] = useState<FilterState>({
		element: [],
		gender: [],
		position: [],
		sort: {}
	});

	const [editingSpecStatSort, setEditingSpecStatSort] = useState<SpecificStats>("focus_at");

	const changeFilter = useCallback(<K extends "gender" | "element" | "position">(item: FilterState[K][number], type: K) => {
		return () => {
			setEditingFilter((prev) => {
				const list = prev[type] as unknown as string[];
				const s = String(item);
				const newList = list.includes(s)
					? list.filter((i) => i !== s)
					: [...list, s];

				return {
					...prev,
					[type]: newList as unknown as FilterState[K]
				};
			});
		};
	}, []);

	const showGetMethod = useCallback((player: Player) => {
		const methods = player.get_methods.length > 0 ? player.get_methods.map((gm) => {
			if (gm.type === "single") {
				return `• ${gm.title}`;
			}
			if (gm.type === "list") {
				return `• ${gm.title}\n  - ${gm.items.join("\n  - ")}`;
			}
			if (gm.type === "record") {
				return `• ${gm.title}\n` + Object.entries(gm.routes).map(([route, items]) => {
					return `  - ${route}\n    - ${items.join("\n    - ")}`;
				}).join("\n");
			}
			return "";
		}).join("\n") : "不明";

		alert(methods);
	}, []);

	const preparedPlayers = useMemo<PreparedRow[]>(() => {
		const prepared = players.players.map((p) => {
			const kick = p.kick ?? 0;
			const control = p.control ?? 0;
			const technique = p.technique ?? 0;
			const pressure = p.pressure ?? 0;
			const physical = p.physical ?? 0;
			const agility = p.agility ?? 0;
			const intelligence = p.intelligence ?? 0;

			const total = kick + control + technique + pressure + physical + agility + intelligence;

			const specificTotals: Record<SpecificStats, number> = {
				"focus_at": Math.round(kick * 0.5 + control + technique),
				"focus_df": Math.round(technique + agility * 0.5 + intelligence),
				"scramble_at": Math.round(intelligence + physical),
				"scramble_df": Math.round(intelligence + pressure),
				"shoot": Math.round(kick + control),
				"wall": Math.round(pressure + physical),
				"keep": Math.round(pressure * 2 + physical * 3 + agility * 4)
			};

			return { player: p, total, specificTotals };
		});
		return prepared;
	}, [players.players]);

	const filterSets = useMemo(() => {
		return {
			gender: new Set(currentFilter.gender),
			element: new Set(currentFilter.element),
			position: new Set(currentFilter.position)
		};
	}, [currentFilter.gender, currentFilter.element, currentFilter.position]);

	const sortRules = useMemo<SortRule[]>(() => {
		const rules: SortRule[] = [];

		for (const [k, order] of Object.entries(currentFilter.sort)) {
			if (!order) continue;

			const dir: 1 | -1 = order === "asc" ? 1 : -1;

			if (k in specificStatsToStatsMap) {
				rules.push({ kind: "specific", key: k as SpecificStats, dir });
			} else {
				rules.push({ kind: "stat", key: k as Stats, dir });
			}
		}

		return rules;
	}, [currentFilter.sort]);

	const activeSpecific = useMemo<SpecificStats | null>(() => {
		for (const r of sortRules) {
			if (r.kind === "specific") return r.key;
		}
		return null;
	}, [sortRules]);

	const filteredRows = useMemo(() => {
		const rows = preparedPlayers.filter((row) => {
			const p = row.player;

			if (filterSets.gender.size > 0 && !filterSets.gender.has(p.gender ?? "")) return false;
			if (filterSets.element.size > 0 && (!p.element || !filterSets.element.has(p.element))) return false;
			if (filterSets.position.size > 0 && (!p.position || !filterSets.position.has(p.position))) return false;
			return true;
		});
		
		if (sortRules.length === 0) return rows;

		rows.sort((a, b) => {
			for (const rule of sortRules) {
				if (rule.kind === "specific") {
					const av = a.specificTotals[rule.key];
					const bv = b.specificTotals[rule.key];
					if (av === bv) continue;
					return (av - bv) * rule.dir;
				}

				const av = a.player[rule.key] ?? -1;
				const bv = b.player[rule.key] ?? -1;
				if (av === bv) continue;
				return (av - bv) * rule.dir;
			}
			return 0;
		});
		return rows;
	}, [preparedPlayers, filterSets, sortRules]);

	return (
		<main className={style.main}>
			<h1 className={style.title}>イナズマイレブン: 英雄たちのヴィクトリーロード 選手一覧</h1>

			<details className={style.optionsSection}>
				<summary>絞り込み/ソートオプション</summary>

				<div className={style.optionGroup}>
					<div className={style.optionName}>性別</div>
					<div className={style.options}>
						{["男", "女"].map((gender) => (
							<label key={gender}>
								<input
									type="checkbox"
									checked={editingFilter.gender.includes(gender)}
									onChange={changeFilter(gender, "gender")}
								/>
								{gender}
							</label>
						))}
					</div>
				</div>

				<div className={style.optionGroup}>
					<div className={style.optionName}>属性</div>
					<div className={style.options}>
						{(["風", "林", "火", "山"] as PlayerElement[]).map((el) => (
							<label key={el}>
								<input
									type="checkbox"
									checked={editingFilter.element.includes(el)}
									onChange={changeFilter(el, "element")}
								/>
								{el}
							</label>
						))}
					</div>
				</div>

				<div className={style.optionGroup}>
					<div className={style.optionName}>ポジション</div>
					<div className={style.options}>
						{(["FW", "MF", "DF", "GK"] as PlayerPosition[]).map((pos) => (
							<label key={pos}>
								<input
									type="checkbox"
									checked={editingFilter.position.includes(pos)}
									onChange={changeFilter(pos, "position")}
								/>
								{pos}
							</label>
						))}
					</div>
				</div>

				<div className={style.optionGroup}>
					<div className={style.optionName}>ソート</div>

					<div className={style.options}>
						{Object.entries(statsToDisplayName).map(([statKey, displayName]) => {
							const sortValue = editingFilter.sort[statKey as Stats] || null;

							return (
								<div key={statKey} className={style.sortOption}>
									<span>{displayName}</span>
									<select
										value={sortValue ?? ""}
										onChange={(e) => {
											const val = e.target.value as SortOption | "";
											setEditingFilter((prev) => ({
												...prev,
												sort: {
													...prev.sort,
													[statKey]: val === "" ? undefined : val
												}
											}));
										}}
									>
										<option value="">なし</option>
										<option value="asc">昇順</option>
										<option value="desc">降順</option>
									</select>
								</div>
							);
						})}
					</div>

					<div className={style.options}>
						<div className={style.sortOption}>
							<select
								value={editingSpecStatSort}
								onChange={(e) => {
									const val = e.target.value as SpecificStats;
									setEditingFilter((prev) => ({
										...prev,
										sort: {
											...prev.sort,
											[editingSpecStatSort]: undefined
										}
									}));
									setEditingSpecStatSort(val);
								}}
							>
								{(Object.keys(specificStatsToDisplayName) as SpecificStats[]).map((k) => (
									<option key={k} value={k}>{specificStatsToDisplayName[k]}</option>
								))}
							</select>

							<select
								value={editingFilter.sort[editingSpecStatSort] || ""}
								onChange={(e) => {
									const val = e.target.value as SortOption | "";
									setEditingFilter((prev) => ({
										...prev,
										sort: {
											...prev.sort,
											[editingSpecStatSort]: val === "" ? undefined : val
										}
									}));
								}}
							>
								<option value="">なし</option>
								<option value="asc">昇順</option>
								<option value="desc">降順</option>
							</select>
						</div>
					</div>
				</div>

				<button
					className={style.applyButton}
					onClick={() => setCurrentFilter(editingFilter)}
				>
					適用
				</button>
			</details>
			
			<div className={style.playerTableContainer}>
				<div id="player-list" className={style.playerTable}>
					<div className={style.pTableHeader}>
						<div className={style.nameHeader} />
						<div>名前</div>
						<div>ポジション</div>
						<div>性別</div>
						<div>属性</div>
						<div>キック</div>
						<div>コントロール</div>
						<div>テクニック</div>
						<div>プレッシャー</div>
						<div>フィジカル</div>
						<div>アジリティ</div>
						<div>インテリジェンス</div>
						<div>合計値</div>
						{activeSpecific ? <div>{specificStatsToDisplayName[activeSpecific]}</div> : <div />}
						<div>入手方法</div>
					</div>
					<PlayersGrid
						filteredRows={filteredRows}
						activeSpecific={activeSpecific}
						showGetMethod={showGetMethod}
					/>
				</div>
			</div>
		</main>
	);
}

// 軽量化のためにメモ化
const PlayersGrid = memo(function PlayersGrid(props: {
	filteredRows: PreparedRow[];
	activeSpecific: SpecificStats | null;
	showGetMethod: (p: Player) => void;
}) {
	const { filteredRows, activeSpecific, showGetMethod } = props;

	const parentRef = useRef<HTMLDivElement | null>(null);
	
	const rowVirtualizer = useVirtualizer({
		count: filteredRows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 61,
		overscan: 10
	});

	return (
		<div ref={parentRef} className={style.playerTableBody}>
			<div
				className={style.pTableSpacer}
				style={{
					height: rowVirtualizer.getTotalSize(),
				}}
			>
				{rowVirtualizer.getVirtualItems().map((virtualRow) => {
					const row = filteredRows[virtualRow.index];
					const p = row.player;

					return (
						<div
							key={p.view_url || p.name}
							className={style.pTableRow}
							style={{
								transform: `translateY(${virtualRow.start}px)`
							}}
						>
							<PlayerImageCell imgUrl={p.img_url} name={p.name} />
							<div>
								<span className={style.name}>{p.name}</span><br />
								<span className={style.nickname}>({p.nickname ?? " - "})</span>
							</div>
							<div>{p.position ?? "-"}</div>
							<div>{p.gender ?? "-"}</div>
							<div>{p.element ?? "-"}</div>
							<div>{p.kick ?? "-"}</div>
							<div>{p.control ?? "-"}</div>
							<div>{p.technique ?? "-"}</div>
							<div>{p.pressure ?? "-"}</div>
							<div>{p.physical ?? "-"}</div>
							<div>{p.agility ?? "-"}</div>
							<div>{p.intelligence ?? "-"}</div>
							<div>{row.total}</div>
							{activeSpecific ? <div>{row.specificTotals[activeSpecific]}</div> : <div />}
							<div><button onClick={() => showGetMethod(p)}>表示</button></div>
						</div>
					);
				})}
			</div>
		</div>
	);
});

const PlayerImageCell = (props: { imgUrl: string; name: string }) => {
	const [showZoomedImage, setShowZoomedImage] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const anchorRef = useRef<HTMLDivElement | null>(null);
	const [rect, setRect] = useState<DOMRect | null>(null);

	const handleEnter = () => {
		timeoutRef.current = setTimeout(() => {
			const el = anchorRef.current;
			if (!el) return;
			setRect(el.getBoundingClientRect());
			setShowZoomedImage(true);
		}, 300);
	};

	const handleLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setShowZoomedImage(false);
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	useEffect(() => {
		if (!showZoomedImage) return;

		const update = () => {
			const el = anchorRef.current;
			if (!el) return;
			setRect(el.getBoundingClientRect());
		};

		update();
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);

		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [showZoomedImage]);

	const portal = useMemo(() => {
		if (typeof window === "undefined") return null;
		return document.body;
	}, []);

	return (
		<>
			<div className={style.playerImage} ref={anchorRef}>
				<Image
					src={props.imgUrl}
					alt={props.name}
					width={60}
					height={60}
					onMouseEnter={handleEnter}
					onMouseLeave={handleLeave}
				/>
			</div>

			{showZoomedImage && rect && portal
				? createPortal(
						<div
							className={style.zoomInImage}
							style={{
								position: "fixed",
								zIndex: 100000,
								left: rect.left + rect.width / 2,
								top: rect.top,
								transform: "translate(-50%, calc(-100% - 8px))"
							}}
							onMouseEnter={handleEnter}
							onMouseLeave={handleLeave}
						>
							<Image src={props.imgUrl} alt={props.name} width={160} height={160} />
						</div>,
						portal
					)
				: null}
		</>
	);
};