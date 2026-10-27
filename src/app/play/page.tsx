export const dynamic = "force-dynamic";

import {
	getCommanders,
	getLeaguePlayerIds,
	getLeagues,
	getPlayerCommanderUsage,
	getPlayers,
} from "@/lib/data";
import LifeCounter from "./LifeCounter";

export default async function PlayPage() {
	const [leagues, players, commanders, playerCommanderUsage, leaguePlayerIds] = await Promise.all([
		getLeagues(),
		getPlayers(),
		getCommanders(),
		getPlayerCommanderUsage(),
		getLeaguePlayerIds(),
	]);

	return (
		<LifeCounter
			leagues={leagues.filter((l) => !l.is_closed)}
			players={players}
			commanders={commanders}
			playerCommanderUsage={playerCommanderUsage}
			leaguePlayerIds={leaguePlayerIds}
		/>
	);
}
