"use client";

import style from "./PlayersListSearchForm.module.css";
import { useEffect, useState } from "react";
import { Filters, emptyFilters } from "@/lib/playerFilters";
import { GENDER, POSITION, ELEMENT, CATEGORY, WORK, BUILD, SORTS } from "@/lib/playerDict";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TeamOption = {
  team_name: string;
  emblem_url: string | null;
  first_seen_number: number | null;
};

async function fetchTeamOptions(workKey: keyof typeof WORK | null): Promise<TeamOption[]> {
  const supabase = createSupabaseBrowserClient();

	const w = workKey ? WORK[workKey] : null;

  const { data, error } = await supabase
    .schema("extended")
    .rpc("get_team_list_for_ui", { w });

  if (error) throw error;
  return (data ?? []) as TeamOption[];
}

export default function PlayersSearchForm(props: {
  applied: Filters;
  onApply: (next: Filters) => void;
  loading?: boolean;
}) {
  const { applied, onApply, loading } = props;

  const [draft, setDraft] = useState<Filters>(applied);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

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
    setDraft((p) => ({ ...p, [key]: value }));
  }

  // 作品(w)が変わったら、チーム候補を取り直す
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setTeamsLoading(true);
      try {
        const nextOptions = await fetchTeamOptions(draft.w);
        if (cancelled) return;

        setTeamOptions(nextOptions);

        if (draft.t) {
          const exists = nextOptions.some((t) => t.team_name === draft.t);
          if (!exists) {
            setDraft((p) => ({ ...p, t: null }));
          }
        }
      } finally {
        if (!cancelled) setTeamsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
		// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.w]);

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
            placeholder="名前/ルビ/ニックネーム"
          />
        </label>

        <label>
          <div>性別</div>
          <select value={draft.g ?? ""} onChange={(e) => update("g", e.target.value as keyof typeof GENDER || null)}>
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
          <select value={draft.pos ?? ""} onChange={(e) => update("pos", e.target.value as keyof typeof POSITION || null)}>
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
          <select value={draft.el ?? ""} onChange={(e) => update("el", e.target.value as keyof typeof ELEMENT || null)}>
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
          <select value={draft.cat ?? ""} onChange={(e) => update("cat", e.target.value as keyof typeof CATEGORY || null)}>
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
          <select
            value={draft.w ?? ""}
            onChange={(e) => {
              const nextW = e.target.value as keyof typeof WORK || null;
              setDraft((p) => ({ ...p, w: nextW }));
            }}
          >
            <option value="">未指定</option>
            {Object.entries(WORK).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <div>チーム</div>
          <select
            value={draft.t ?? ""}
            disabled={teamsLoading}
            onChange={(e) => update("t", e.target.value || null)}
						style={{width: "13rem"}}
          >
            <option value="">{teamsLoading ? "読み込み中" : "未指定"}</option>
            {teamOptions.map((t) => (
              <option key={t.team_name} value={t.team_name}>
                {t.team_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <div>メインビルド</div>
          <select value={draft.b ?? ""} onChange={(e) => update("b", e.target.value as keyof typeof BUILD || null)}>
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
            <option value="">未指定(番号順)</option>
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
