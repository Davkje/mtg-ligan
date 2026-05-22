export const dynamic = "force-dynamic";

import { getLeagues, getMatchSummary } from "@/lib/data";
import LeagueList from "./LeagueList";

export default async function LeaguesPage() {
  const leagues = await getLeagues();
  const summary = await getMatchSummary(leagues);
  const matchCountById = Object.fromEntries(
    leagues.map((l) => [l.id, summary.byLeague.get(l.id) ?? 0]),
  );

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Leagues</h1>
      <LeagueList leagues={leagues} matchCountById={matchCountById} />
    </div>
  );
}
