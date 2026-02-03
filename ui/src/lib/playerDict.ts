export const GENDER = {
  m: "男",
  f: "女",
	n: "不明",
} as const;

export const POSITION = {
  gk: "GK",
  df: "DF",
  mf: "MF",
  fw: "FW",
} as const;

export const ELEMENT = {
  wi: "風",
  fo: "林",
  fi: "火",
  mt: "山",
} as const;

export const CATEGORY = {
  pl: ["選手"],
  le: ["監督", "コーチ"],
  mg: ["マネージャー"],
} as const;

export type CategoryCode = keyof typeof CATEGORY;

export const WORK = {
	ie1: "イナズマイレブン",
	ie2: "イナズマイレブン2 脅威の侵略者 ファイア／ブリザード",
	ie3: "イナズマイレブン3 世界への挑戦!! スパーク／ボンバー／ジ・オーガ",
	go1: "イナズマイレブンGO シャイン／ダーク",
	go2: "イナズマイレブンGO2 クロノ・ストーン ネップウ／ライメイ",
	go3: "イナズマイレブンGO ギャラクシー ビッグバン／スーパーノヴァ",
	ars: "イナズマイレブン アレスの天秤",
	ori: "イナズマイレブン オリオンの刻印",
	vic: "イナズマイレブン 英雄たちのヴィクトリーロード",
} as const;

export const BUILD = {
	breach: "ひっさつ",
	counter: "カウンター",
	bond: "キズナ",
	tension: "テンション",
	rough: "ラフプレー",
	justice: "正義"
}

export type SortId = 
		"focus_at"
	| "focus_df"
	| "scramble_at"
	| "scramble_df"
	| "shoot_at"
	| "wall_df"
	| "kp";

export const SORTS: Record<SortId, string> = {
  focus_at: "フォーカスAT",
	focus_df: "フォーカスDF",
	scramble_at: "スクランブルAT",
	scramble_df: "スクランブルDF",
	shoot_at: "シュートAT",
	wall_df: "城壁DF",
	kp: "KP"
};