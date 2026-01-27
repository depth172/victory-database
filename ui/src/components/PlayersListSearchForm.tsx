"use client";

import style from "./PlayersListSearchForm.module.css";
import { useEffect, useState } from "react";
import { Filters, emptyFilters } from "@/lib/playerFilters";
import { GENDER, POSITION, ELEMENT, CATEGORY, WORK, BUILD, SORTS } from "@/lib/playerDict";

export default function PlayersSearchForm(props: {
  applied: Filters;                 // URL由来
  onApply: (next: Filters) => void; // URL更新（push）
  loading?: boolean;
}) {
  const { applied, onApply, loading } = props;

  const [draft, setDraft] = useState<Filters>(applied);

  // 戻る/進む等でURLが変わったらフォームも追従
  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className={style.searchForm}>
			<div className={style.title}>絞り込み</div>
			<div className={style.inputs}>
				<label className={style.textSearch}>
					<div>検索キーワード</div>
					<input
						value={draft.q}
						onChange={(e) => update("q", e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !loading) {
								onApply({ ...draft, q: draft.q.trim() });
							}
						}}
						placeholder="名前/ルビ/ニックネーム"
					/>
				</label>
				
				
				<label>
					<div>性別</div>
					<select value={draft.g ?? ""} onChange={(e) => update("g", e.target.value || null)}>
						<option value="">未指定</option>
						{Object.entries(GENDER).map(([code, name]) => (
							<option key={code} value={code}>
								{name}
							</option>
						))}
					</select>
				</label>

				<label>
					<div>ポジション</div>
					<select value={draft.pos ?? ""} onChange={(e) => update("pos", e.target.value || null)}>
						<option value="">未指定</option>
						{Object.entries(POSITION).map(([code, name]) => (
							<option key={code} value={code}>
								{name}
							</option>
						))}
					</select>
				</label>

				<label>
					<div>属性</div>
					<select value={draft.el ?? ""} onChange={(e) => update("el", e.target.value || null)}>
						<option value="">未指定</option>
						{Object.entries(ELEMENT).map(([code, name]) => (
							<option key={code} value={code}>
								{name}
							</option>
						))}
					</select>
				</label>

				<label>
					<div>カテゴリ</div>
					<select value={draft.cat ?? ""} onChange={(e) => update("cat", e.target.value || null)}>
						<option value="">未指定</option>
						{Object.entries(CATEGORY).map(([code, names]) => (
							<option key={code} value={code}>
								{names.join("/")}
							</option>
						))}
					</select>
				</label>

				<label className={style.workSelect}>
					<div>初登場作品</div>
					<select value={draft.w ?? ""} onChange={(e) => update("w", e.target.value || null)}>
						<option value="">未指定</option>
						{Object.entries(WORK).map(([code, name]) => (
							<option key={code} value={code}>
								{name}
							</option>
						))}
					</select>
				</label>

				<label>
					<div>メインビルド</div>
					<select value={draft.b ?? ""} onChange={(e) => update("b", e.target.value || null)}>
						<option value="">未指定</option>
						{Object.entries(BUILD).map(([code, name]) => (
							<option key={code} value={code}>
								{name}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className={style.title}>ソート</div>
			<div className={style.inputs}>
				<label>
					<div>並び順</div>
					<select
						value={draft.sid ? draft.sid : ""}
						onChange={(e) => update("sid", e.target.value ? (e.target.value as Filters["sid"]) : null)}
					>
						<option value="">未指定</option>
						{Object.entries(SORTS).map(([id, name]) => (
							<option key={id} value={id}>
								{name}
							</option>
						))}
					</select>
				</label>
				<label>
					<div>方向</div>
					<select
						value={draft.sdir ? draft.sdir : ""}
						onChange={(e) => update("sdir", e.target.value ? (e.target.value as Filters["sdir"]) : null)}
					>
						<option value="">降順</option>
						<option value="asc">昇順</option>
					</select>
				</label>
			</div>
				
			<div className={style.buttons}>
				<button
					disabled={loading}
					onClick={() => onApply({ ...draft, q: draft.q.trim() })}
				>
					検索
				</button>

				<button disabled={loading} onClick={() => onApply(emptyFilters)}>
					クリア
				</button>
			</div>
    </div>
  );
}