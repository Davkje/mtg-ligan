export const dynamic = "force-dynamic";

import { getAllMatches, getCommanders, getLeagues, getPlayers } from "@/lib/data";
import MatchList from "./MatchList";

export default async function HistoryPage() {
  const [matches, players, commanders, leagues] = await Promise.all([
    getAllMatches(),
    getPlayers(),
    getCommanders(),
    getLeagues(),
  ]);
  return <MatchList matches={matches} players={players} commanders={commanders} leagues={leagues} />;
}
