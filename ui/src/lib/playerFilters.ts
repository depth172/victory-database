export type Filters = {
  q: string;
  w: string | null;
  pos: string | null;
  el: string | null;
  g: string | null;
  cat: string | null;
	b: string | null;
};

export const emptyFilters: Filters = { q: "", w: null, pos: null, el: null, g: null, cat: null, b: null };

export function filtersFromSearchParams(sp: URLSearchParams): Filters {
  return {
    q: (sp.get("q") ?? "").trim(),
    w: sp.get("w"),
    pos: sp.get("pos"),
    el: sp.get("el"),
    g: sp.get("g"),
    cat: sp.get("cat"),
    b: sp.get("b"),
  };
}

export function searchParamsFromFilters(f: Filters) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.w) sp.set("w", f.w);
  if (f.pos) sp.set("pos", f.pos);
  if (f.el) sp.set("el", f.el);
  if (f.g) sp.set("g", f.g);
  if (f.cat) sp.set("cat", f.cat);
	if (f.b) sp.set("b", f.b);
  return sp;
}