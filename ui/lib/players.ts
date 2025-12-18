import playersJson from "@data";
import type { Player } from "@shared/types";

type PlayersJson = {
	count: number;
	players: Player[];
}

export function getPlayers(): PlayersJson {
	return playersJson as PlayersJson;
}