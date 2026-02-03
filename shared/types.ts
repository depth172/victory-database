export type GetMethod =
	| { type: "single"; title: string }
	| { type: "list"; title: string; items: string[] }
	| { type: "record"; title: string; routes: Record<string, string[]> };

export type PlayerPosition = "FW" | "MF" | "DF" | "GK";
export type PlayerElement = "風" | "林" | "火" | "山";
export type PlayerBuild = "breach" | "counter" | "bond" | "tension" | "rough_play" | "justice";
export type PlayerBuildName = "ひっさつ" | "カウンター" | "キズナ" | "テンション" | "ラフプレー" | "正義";

export type Player = {
	number: number;
	name: string;
	ruby: string;
	nickname: string;
	appeared_works: string;
	description: string;
	get_methods: GetMethod[];
	img_url: string;
	view_url: string;

	position: PlayerPosition | null;
	element: PlayerElement | null;
	kick: number | null;
	control: number | null;
	technique: number | null;
	pressure: number | null;
	physical: number | null;
	agility: number | null;
	intelligence: number | null;

	age_group: string;
	grade: string;
	gender: string;
	category: string[];
	affiliation: string[];
};

export type SpecialMoveCategory = "shoot" | "offense" | "defense" | "keeper";
export type SpecialMoveElement = PlayerElement | "無";
export type SpecialMoveEffect = "long_shoot" | "counter_shoot" | "shoot_block" | "punching";

export type SpecialMove = {
	number: number;
	name: string;
	description: string;
	thumbnail: string;
	category: SpecialMoveCategory;
}

export type ExtendedSpecialMove = SpecialMove & {
	power: number;
	tension_cost: number;
	element: SpecialMoveElement;
	effect?: SpecialMoveEffect;
};
