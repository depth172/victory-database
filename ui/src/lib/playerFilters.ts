import { BUILD, CATEGORY, decodeFromDict, ELEMENT, GENDER, POSITION, SortId, WORK } from "./playerDict";
import { PlayerRow } from "@/types";
import { createSupabaseBrowserClient } from "./supabase/client";

export type Filters = {
  q: string | null;
  w: keyof typeof WORK | null;
  pos: keyof typeof POSITION | null;
  el: keyof typeof ELEMENT | null;
  g: keyof typeof GENDER | null;
  cat: keyof typeof CATEGORY | null;
	b: keyof typeof BUILD | null;
	t: string | null;
	sid: SortId | null;
	sdir: "asc" | "desc" | null;
};

export const emptyFilters: Filters = { q: "", w: null, pos: null, el: null, g: null, cat: null, b: null, t: null, sid: null, sdir: null };

export function filtersFromSearchParams(sp: URLSearchParams): Filters {
  return {
    q: decodeURIComponent((sp.get("q") ?? "")).trim(),
    w: sp.get("w") as keyof typeof WORK | null,
    pos: sp.get("pos") as keyof typeof POSITION | null,
    el: sp.get("el") as keyof typeof ELEMENT | null,
    g: sp.get("g") as keyof typeof GENDER | null,
    cat: sp.get("cat") as keyof typeof CATEGORY | null,
    b: sp.get("b") as keyof typeof BUILD | null,
    t: decodeURIComponent(sp.get("t") ?? "") || null,
    sid: sp.get("sid") as SortId | null,
    sdir: sp.get("sdir") as "asc" | "desc" | null,
  };
}

export function searchParamsFromFilters(f: Filters) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", encodeURIComponent(f.q));
  if (f.w) sp.set("w", f.w);
  if (f.pos) sp.set("pos", f.pos);
  if (f.el) sp.set("el", f.el);
  if (f.g) sp.set("g", f.g);
  if (f.cat) sp.set("cat", f.cat);
	if (f.b) sp.set("b", f.b);
	if (f.t) sp.set("t", encodeURIComponent(f.t));
	if (f.sid) sp.set("sid", f.sid);
	if (f.sdir) sp.set("sdir", f.sdir);
  return sp;
}

type SortSpec =
  | { id: string; dir: "asc" | "desc" }
  | null;

export type Cursor =
  | { number: number; sortValue: number | null }
  | null;

type FetchPlayersArgs = {
  pageSize: number;
  cursor: Cursor;
  filters: Filters;
  sort: SortSpec;
};

export async function fetchPlayersPage(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  args: FetchPlayersArgs
) {
  const { pageSize, cursor, filters, sort } = args;

  const catTargets =
    filters.cat
      ? CATEGORY[filters.cat as keyof typeof CATEGORY] ?? null
      : null;

  const { data, error } = await supabase
	.schema("extended")
	.rpc(
    "get_players_page",
    {
      page_size: pageSize,

      sort_id: sort?.id ?? null,
      sort_dir: sort?.dir ?? null,

      last_sort_value: cursor?.sortValue ?? null,
      last_number: cursor?.number ?? null,

      q: filters.q ?? null,
      w: filters.w ? decodeFromDict(WORK, filters.w) : null,
      pos: filters.pos ? decodeFromDict(POSITION, filters.pos) : null,
      el: filters.el ? decodeFromDict(ELEMENT, filters.el) : null,
      g: filters.g ? decodeFromDict(GENDER, filters.g) : null,
      b: filters.b ? decodeFromDict(BUILD, filters.b) : null,
			t: filters.t ?? null,

      cat_targets: catTargets,
    }
  );

  if (error) {
		console.error("RPC error", error);
		throw error;
	}

  return data as PlayerRow[];
}
