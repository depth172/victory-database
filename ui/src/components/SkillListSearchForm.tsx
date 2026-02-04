"use client";

import { Filters } from "@/lib/skillFilter";
import style from "./ListSearchForm.module.css";
import { useEffect, useState } from "react";
import { CATEGORY, ELEMENT, SORTS } from "@/lib/skillDict";

export const emptyFilters: Filters = { q: "", el: null, c: null, ef: null, sid: null, sdir: null };

export default function SkillsSearchForm(props: {
  applied: Filters;
  onApply: (next: Filters) => void;
  loading?: boolean;
}) {
  const { applied, onApply, loading } = props;

  const [draft, setDraft] = useState<Filters>(applied);

  // 戻る/進む等でURLが変わったらフォームも追従
  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
		if (key === "sid" && value === null) {
			// sidが未指定になったらsdirもクリア
			setDraft((p) => ({ ...p, sid: null, sdir: null }));
			return;
		}
		if (key === "c" && value !== draft.c) {
			// カテゴリが変わったら効果もクリア
			setDraft((p) => ({ ...p, [key]: value, ef: null }));
			return;
		}
    setDraft((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className={style.searchForm}>
      <div className={style.title}>絞り込み</div>
      <div className={style.inputs}>
        <label className={style.textSearch}>
          <div>検索キーワード</div>
          <input
            value={draft.q || ""}
            onChange={(e) => update("q", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                onApply({ ...draft, q: draft.q?.trim() ?? "" });
              }
            }}
            placeholder="名前"
          />
        </label>

        <label>
          <div>カテゴリ</div>
          <select value={draft.c ?? ""} onChange={(e) => update("c", e.target.value as keyof typeof CATEGORY || null)}>
            <option value="">未指定</option>
            {Object.entries(CATEGORY).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <div>属性</div>
          <select value={draft.el ?? ""} onChange={(e) => update("el", e.target.value as keyof typeof ELEMENT || null)}>
            <option value="">未指定</option>
            {Object.entries(ELEMENT).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
				
				{draft.c && draft.c in { sh: "shoot", df: "defense" } ? (
					<div className={style.labelWrap}>
						<div>効果</div>
						<div className={style.effectOptions}>
							{draft.c === "sh" ? (
								<>
								<label>
									<input
										type="radio"
										checked={draft.ef === null}
										onChange={() => update("ef", null)}
									/>
									<div>未指定</div>
								</label>
								<label>
									<input
										type="radio"
										checked={draft.ef === "long_shoot"}
										onChange={(e) => update("ef", e.target.checked ? "long_shoot" : null)}
									/>
									<div>ロングシュート</div>
								</label>
								<label>
									<input
										type="radio"
										checked={draft.ef === "counter_shoot"}
										onChange={(e) => update("ef", e.target.checked ? "counter_shoot" : null)}
									/>
									<div>カウンターシュート</div>
								</label>
								</>
							) : draft.c === "df" ? (
								<label>
									<input
										type="checkbox"
										checked={draft.ef === "shoot_block"}
										onChange={(e) => update("ef", e.target.checked ? "shoot_block" : null)}
									/>
									<div>シュートブロック</div>
								</label>
							) : (
								<></>
							)}
						</div>
					</div>
				) : null}
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
						disabled={!draft.sid}
          >
            <option value="">降順</option>
            <option value="asc">昇順</option>
          </select>
        </label>
      </div>

      <div className={style.buttons}>
        <button disabled={loading} onClick={() => onApply(emptyFilters)}>
          クリア
        </button>

        <button disabled={loading} onClick={() => onApply({ ...draft, q: draft.q?.trim() ?? "" })}>
          検索
        </button>
      </div>
    </div>
  );
}
