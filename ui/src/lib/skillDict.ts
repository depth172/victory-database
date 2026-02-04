export const ELEMENT = {
  wi: "風",
  fo: "林",
  fi: "火",
  mt: "山",
	ne: "無"
} as const;

export const CATEGORY = {
  sh: "シュート",
	of: "オフェンス",
	df: "ディフェンス",
	kp: "キーパー"
} as const;

export type SkillSortId = 
		"power"
	| "tension_cost"

export const SORTS: Record<SkillSortId, string> = {
	power: "威力",
	tension_cost: "消費テンション"
};