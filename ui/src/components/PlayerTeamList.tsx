import { createSupabaseServerClient } from "@/lib/supabase/server";
import style from "./PlayerTeamList.module.css";
import Image from "next/image";

type Team = {
	id: string;
	name: string;
	appeared_work: string;
	emblem_url: string | null;
}

type TeamRow = {
	idx: number;
	teams: Team | null;
}

export default async function PlayerTeamList(props: { playerId: string; }) {
	const supabase = createSupabaseServerClient();
	const id = props.playerId;

	const { data: teamData, error: teamError } = await supabase
		.schema("extended")
		.from("player_team_memberships")
		.select(`
			idx,
			teams:team_id (
				id,
				name,
				appeared_work,
				emblem_url
			)
		`)
		.eq("player_id", id)
		.order("idx", { ascending: true })
		.overrideTypes<TeamRow[]>();

	if (teamError) throw teamError;

	const teams = (teamData ?? [])
		.filter((r): r is TeamRow & { teams: Team } => r.teams !== null)
		.map(r => ({
			idx: r.idx,
			id: r.teams.id,
			name: r.teams.name,
			appeared_work: r.teams.appeared_work,
			emblem_url: r.teams.emblem_url,
		}));

	return (
		<ul className={style.teamList}>
			{teams.map((team) => (
				<li key={team.id} className={style.teamItem}>
					{team.emblem_url && (
						<Image src={team.emblem_url} alt={`${team.name} エンブレム`} width={32} height={32} className={style.emblem} />
					)}
					<div className={style.teamName}>{team.name}</div>
				</li>
			))}
		</ul>
	);
}