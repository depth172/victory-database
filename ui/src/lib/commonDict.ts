type Dict = Record<string, string>;

export function decodeFromDict(dict: Dict, code: string | null) {
  if (!code) return null;
  return dict[code] ?? null;
}

export function encodeToDict(dict: Dict, value: string | null) {
  if (!value) return null;
  const entry = Object.entries(dict).find(([, v]) => v === value);
  return entry?.[0] ?? null;
}