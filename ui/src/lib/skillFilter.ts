import { ELEMENT, CATEGORY, SortId } from "./skillDict";
import { PlayerRow, Skill } from "@/types";
import { createSupabaseBrowserClient } from "./supabase/client";

export type Filters = {
	q: string | null;
  e: keyof typeof ELEMENT | null;
  c: keyof typeof CATEGORY | null;
	sid: SortId | null;
	sdir: "asc" | "desc" | null;
};

export const emptyFilters: Filters = { q: null, e: null, c: null, sid: null, sdir: null };

export function filtersFromSearchParams(sp: URLSearchParams): Filters {
  return {
    q: sp.get("q"),
    e: sp.get("e") as keyof typeof ELEMENT | null,
    c: sp.get("c") as keyof typeof CATEGORY | null,
    sid: sp.get("sid") as SortId | null,
    sdir: sp.get("sdir") as "asc" | "desc" | null,
  };
}

export function searchParamsFromFilters(f: Filters) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.e) sp.set("e", f.e);
  if (f.c) sp.set("c", f.c);
  if (f.sid) sp.set("sid", f.sid);
  if (f.sdir) sp.set("sdir", f.sdir);
  return sp;
}

type SortSpec =
  | { id: string; dir: "asc" | "desc" }
  | null;

export type Cursor =
  | { number: number; sortValue: number | null; playerId: string | null }
  | null;

type FetchPlayersArgs = {
  pageSize: number;
  cursor: Cursor;
  filters: Filters;
  sort: SortSpec;
};

export async function fetchSkillsPage(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  args: FetchPlayersArgs
) {
  const { pageSize, cursor, filters, sort } = args;

  const catTargets =
    filters.c
      ? CATEGORY[filters.c as keyof typeof CATEGORY] ?? null
      : null;

  const { data, error } = await supabase
		.schema("extended")
		.from("all_skills")
		.select("*")
		.eq("kind", "special_move")
		.order("number", { ascending: true })

  if (error) {
		console.error("RPC error", error);
		throw error;
	}

  return data as Skill[];
}
