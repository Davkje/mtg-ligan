export const dynamic = "force-dynamic";

import { getAllMatches, getPlayers } from "@/lib/data";
import MatchList from "./MatchList";

export default async function HistoryPage() {
  const [matches, players] = await Promise.all([getAllMatches(), getPlayers()]);
  return <MatchList matches={matches} players={players} />;
}
