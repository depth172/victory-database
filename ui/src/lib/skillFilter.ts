import { ELEMENT, CATEGORY, SkillSortId } from "./skillDict";
import { SkillRow } from "@/types";
import { createSupabaseBrowserClient } from "./supabase/client";
import { decodeFromDict } from "./commonDict";
import { SpecialMoveEffect } from "@shared/types";

export type Filters = {
	q: string | null;
  c: keyof typeof CATEGORY | null;
  el: keyof typeof ELEMENT | null;
  ef: SpecialMoveEffect | null;
	sid: SkillSortId | null;
	sdir: "asc" | "desc" | null;
};

export const emptyFilters: Filters = { q: null, el: null, c: null, ef: null, sid: null, sdir: null };

export function filtersFromSearchParams(sp: URLSearchParams): Filters {
  return {
    q: sp.get("q"),
    el: sp.get("el") as keyof typeof ELEMENT | null,
		ef: sp.get("ef") as SpecialMoveEffect | null,
    c: sp.get("c") as keyof typeof CATEGORY | null,
    sid: sp.get("sid") as SkillSortId | null,
    sdir: sp.get("sdir") as "asc" | "desc" | null,
  };
}

export function searchParamsFromFilters(f: Filters) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.el) sp.set("el", f.el);
  if (f.ef) sp.set("ef", f.ef);
  if (f.c) sp.set("c", f.c);
  if (f.sid) sp.set("sid", f.sid);
  if (f.sdir) sp.set("sdir", f.sdir);
  return sp;
}

export type Cursor =
  | { number: number; sortValue: number | null; playerId: string | null }
  | null;

export type SkillCursor =
  | null
  | {
      // sort_id=null のとき
      number?: number | null;
      id?: string;

      // sort_idありのとき
      nullFlag?: number | null;
      sortValue?: number | null;
    };

export type FetchSkillsArgs = {
  pageSize: number;
  cursor: SkillCursor;
  filters: Filters;
};

const CATEGORY_ENUM = {
  sh: "shoot",
	of: "offense",
	df: "defense",
	kp: "keeper"
} as const;

export async function fetchSkillsPage(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  args: FetchSkillsArgs
) {
  const { pageSize, cursor, filters } = args;

  // 必要なら decode（短縮を使ってないならこの2行はそのまま filters.* でOK）
  const c = filters.c ? decodeFromDict(CATEGORY_ENUM, filters.c) : null;
  const el = filters.el ? decodeFromDict(ELEMENT, filters.el) : null;
	const ef = filters.ef ?? null;

  const sortId = filters.sid ?? null;
  const sortDir = filters.sdir ?? "desc";

  const payload =
    sortId === null
      ? {
          page_size: pageSize,

          sort_id: null,
          sort_dir: sortDir, // 使われないけど一応

          // デフォルト並び用cursor
          last_number: cursor?.number ?? null,
          last_id: cursor?.id ?? null,

          // フィルタ
          q: filters.q ?? null,
          cat: c,
          el,
					ef,
        }
      : {
          page_size: pageSize,

          sort_id: sortId,
          sort_dir: sortDir,

          // 数値ソート用cursor
          last_null_flag: cursor?.nullFlag ?? null,
          last_sort_value: cursor?.sortValue ?? null,
          last_id: cursor?.id ?? null,
					last_number: cursor?.number ?? null,

          // フィルタ
          q: filters.q ?? null,
          cat: c,
          el,
					ef,
        };

  const { data, error } = await supabase
    .schema("extended")
    .rpc("get_special_moves_page", payload);

  if (error) {
    console.error("RPC error", error);
    throw error;
  }

  return data as SkillRow[];
}
