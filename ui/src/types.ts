import { PlayerPosition, PlayerElement, PlayerBuildName, PlayerBuild } from "@/../../shared/types";
import { Player } from "@/../../shared/types";

export type PlayerClient = Omit<Player, "number"> & {
	number: string;
};

export type PlayerRow = {
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
	affiliation: string[];

	focus_at: number | null;
	focus_df: number | null;
	scramble_at: number | null;
	scramble_df: number | null;
	shoot_at: number | null;
	wall_df: number | null;
	kp: number | null;
};

export type ExtendedPlayer = PlayerClient & {
	main_build_id: PlayerBuild | null;
	main_build_name: PlayerBuildName | null;
};

