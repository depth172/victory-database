import { PlayerPosition, PlayerElement, PlayerBuildName, PlayerBuild, Player } from "@/../../shared/types";

export type PlayerRow = {
	player_id: string;
	number: number;
	name: string;
	ruby: string;
	nickname: string;
	appeared_works: string;
	img_url: string;

	position: PlayerPosition | null;
	element: PlayerElement | null;
	main_build_name: PlayerBuildName | null;

	age_group: string;
	grade: string;
	gender: string;
	category: string[];

	affiliation_primary_name: string;
	affiliation_primary_emblem_url: string | null;

	focus_at: number | null;
	focus_df: number | null;
	scramble_at: number | null;
	scramble_df: number | null;
	shoot_at: number | null;
	wall_df: number | null;
	kp: number | null;
};

export type ExtendedPlayer = Player & {
	player_id: string;
	main_build_id: PlayerBuild | null;
	main_build_name: PlayerBuildName | null;
};

export type SkillEffect =
	| "long_shoot"
	| "counter_shoot"
	| "shoot_block"
	| "punching";

export type Skill = {
  id: string;
	name: string;
	description: string;
	thumbnail: string;
	category: string;
	element: PlayerElement | "無";
	effect: SkillEffect | null;
	power: number;
	tension_cost: number;
};

export type Keshin = Omit<Skill, "power" | "tension_cost"> & {
	kind: "keshin";
	buffs: {
		target: "self" | "nearby" | "team";
		stat: "focus_at_df" | "scramble_at_df" | "shoot_at_df" | "wall_df" | "kp";
		value: number;
	}[];
	replaces_special_move_id: string;
};