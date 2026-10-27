export const dynamic = "force-dynamic";

import { getLeagueLeaderboard, getLeagues, getMatchSummary, getPlayers } from "@/lib/data";
import LeagueList, { type StandingOption } from "./LeagueList";

export default async function LeaguesPage() {
  const [leagues, players] = await Promise.all([getLeagues(), getPlayers()]);
  const summary = await getMatchSummary(leagues);
  const matchCountById = Object.fromEntries(
    leagues.map((l) => [l.id, summary.byLeague.get(l.id) ?? 0]),
  );

  // Standings for open official leagues — used to pick a winner when closing
  const closable = leagues.filter((l) => !l.is_practice && !l.is_closed && matchCountById[l.id] > 0);
  const standingsById: Record<string, StandingOption[]> = Object.fromEntries(
    await Promise.all(
      closable.map(async (l) => [
        l.id,
        (await getLeagueLeaderboard(l.id)).map((s) => ({
          playerId: s.player.id,
          name: s.player.name,
          points: s.totalPoints,
        })),
      ]),
    ),
  );

  const playerNameById = Object.fromEntries(players.map((p) => [p.id, p.name]));

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Leagues</h1>
      <LeagueList
        leagues={leagues}
        matchCountById={matchCountById}
        standingsById={standingsById}
        playerNameById={playerNameById}
      />
    </div>
  );
}
