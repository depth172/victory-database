"use client";

import { SkillEffect, SkillRow } from "@/types";
import style from "./SkillList.module.css";
import SkillCategoryIcon from "./icons/SkillCategoryIcon";
import ElementIcon from "./icons/ElementIcon";
import Image from "next/image";
import SkillEffectIcon from "./icons/SkillEffectIcon";
import Link from "next/link";
import { fetchSkillsPage, Filters, filtersFromSearchParams, searchParamsFromFilters, SkillCursor } from "@/lib/skillFilter";
import { usePathname, useRouter, useSearchParams } from "next/dist/client/components/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SkillsSearchForm from "./SkillListSearchForm";
import LoadingSpinner from "./common/LoadingSpinner";

type Props = {
	initialItems: SkillRow[];
	initialCursor: SkillCursor;
};

const effectDict: Record<SkillEffect, string> = {
	"counter_shoot": "カウンターシュート",
	"long_shoot": "ロングシュート",
	"shoot_block": "シュートブロック",
	"punching": "パンチング",
};

export default function SkillList(props: Props) {
	const { initialItems, initialCursor } = props;

	const router = useRouter();
	const pathname = usePathname();
	const sp = useSearchParams();

	const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
	if (!supabaseRef.current) {
		supabaseRef.current = createSupabaseBrowserClient();
	}
	const supabase = supabaseRef.current;

	const [skills, setSkills] = useState<SkillRow[]>(initialItems);
	const [cursor, setCursor] = useState<SkillCursor>(initialCursor);
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(initialItems.length === 0);

	const loadingRef = useRef(false);
	const skipNextReloadRef = useRef(false);

	const sentinelRef = useRef<HTMLDivElement>(null);

	const applied: Filters = useMemo(() => {
		return filtersFromSearchParams(new URLSearchParams(sp.toString()));
	}, [sp]);

	function nextSkillCursor(rows: SkillRow[], sort: Filters): SkillCursor {
		const last = rows.at(-1);
		if (!last) return null;

		if (!sort?.sid) {
			return {
				number: last.number ?? null,
				id: last.id,
			};
		}

		return {
			nullFlag: last.cursor_null_flag ?? null,
			sortValue: last.cursor_sort_value ?? null,
			id: last.id,
			number: last.number ?? null,
		};
	}

	async function reloadByFilters(f: Filters) {
		loadingRef.current = true;
		setLoading(true);
		setDone(false);

		const rows = await fetchSkillsPage(supabase, {
			pageSize: 60,
			cursor: null,
			filters: f,
		});

		setSkills(rows);
		setCursor(nextSkillCursor(rows, f));
		setDone(rows.length < 60);
		setLoading(false);
		loadingRef.current = false;
	}
	
	function onApply(next: Filters) {
		skipNextReloadRef.current = true; // useEffect での reload をスキップ
		reloadByFilters(next);
		const nextSp = searchParamsFromFilters(next);
		const qs = nextSp.toString();
		router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	}
	
	useEffect(() => {
		if (skipNextReloadRef.current) {
			skipNextReloadRef.current = false;
			return;
		}

		reloadByFilters(applied);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [applied]);

	const loadMore = useCallback(async () => {
		if (loadingRef.current || done || !cursor) {
			return;
		}

		loadingRef.current = true;
		setLoading(true);

		try {
			const rows = await fetchSkillsPage(supabase, {
				pageSize: 60,
				cursor,
				filters: applied,
			});

			if (rows.length === 0) {
				setDone(true);
				return;
			}

			// ここで重複を弾く（保険）
			setSkills((prev) => {
				const seen = new Set(prev.map((p) => p.number));
				const next = rows.filter((r) => !seen.has(r.number));
				return [...prev, ...next];
			});

			setCursor(nextSkillCursor(rows, applied));
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
	}, [cursor, done, applied, supabase]);

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
	}, [loadMore]);
	
	
	return (
		<div className={style.skillListContainer}>
			<SkillsSearchForm applied={applied} onApply={onApply} loading={loading} />

			<ul className={style.list}>
				{skills.map((skill) => (
					<li key={skill.id}>
						<Link href={`/skill/${skill.id}`} className={style.listItem}>
							<div className={`
								${style.skillHeader} 
								${skill.element === "風" ? style.wind :
									skill.element === "林" ? style.forest :
									skill.element === "火" ? style.fire :
									skill.element === "山" ? style.mountain :
									skill.element === "無" ? style.none : ""
								}
							`}>
								<div className={style.skillTitle}>
									<SkillCategoryIcon category={skill.category} />
									<ElementIcon element={skill.element} />
									<div className={style.skillName}>
										{skill.name}
									</div>
								</div>
								{skill.effect && (
									<div className={style.skillEffect}>
										{effectDict[skill.effect]}
										<SkillEffectIcon effect={skill.effect ?? ""} size={24} />
									</div>
								)}
							</div>
							<div className={style.skillDetails}>
								<div className={style.imageSection}>
									{skill.thumbnail && (
										<Image src={skill.thumbnail} alt={skill.name} width={224} height={126} sizes="224px" />
									)}
								</div>
								<div className={style.textSection}>
									<div className={style.skillDescription}>
										{skill.description}
									</div>
									<div className={style.skillStats}>
										<div className={`${style.skillStat} ${style.tensionCost}`}>
											<div>消費</div>
											<div className={style.numberCell}>
												<span className={style.number}>{skill.tension_cost}</span>
												<span>T</span>
											</div>
										</div>
										<div className={`${style.skillStat} ${style.power}`}>
											<div>威力</div>
											<div className={style.numberCell}>
												<span className={style.number}>{skill.power}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</Link>
					</li>
				))}
			</ul>

			<div ref={sentinelRef} style={{ height: 1 }} />

      {skills.length > 0 && (
			<div className={style.loadingArea}>
        {done ? <div className={style.loadingText}>リストはこれで全てです。</div> : <LoadingSpinner />}
      </div>
			)}

		</div>
	);
}