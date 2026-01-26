import { PlayerPosition, PlayerElement, PlayerBuildName } from "@/../../shared/types";
 
export type PlayerRow = {
	id: string;
	number: number | null;
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
};
