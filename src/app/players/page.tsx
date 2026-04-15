import Link from "next/link";
import { getLeaderboard, getPlayers } from "@/lib/data";
import PlayersClient from "./PlayersClient";

export default async function PlayersPage() {
  const [allPlayers, leaderboard] = await Promise.all([getPlayers(), getLeaderboard()]);

  const statsMap = new Map(leaderboard.map((e) => [e.player.id, e]));

  // All players, ranked players first then unranked alphabetically
  const entries = allPlayers.map((player) => {
    const stats = statsMap.get(player.id);
    return stats ?? { player, totalPoints: 0, matches: 0, wins: 0, winRate: 0, rank: null };
  }).sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return a.player.name.localeCompare(b.player.name);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
        <PlayersClient />
      </div>

      {entries.length === 0 ? (
        <p className="text-foreground/40 text-sm">No players yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map((entry) => (
            <Link
              key={entry.player.id}
              href={`/player/${entry.player.id}`}
              className="rounded-lg border border-border bg-surface p-4 hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg group-hover:text-accent transition-colors">
                  {entry.player.name}
                </span>
                <span className="text-xs text-foreground/40">
                  {entry.rank !== null ? `#${entry.rank}` : "—"}
                </span>
              </div>
              {entry.matches > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-accent">{entry.totalPoints}</div>
                    <div className="text-xs text-foreground/50">pts</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{entry.matches}</div>
                    <div className="text-xs text-foreground/50">matches</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{entry.winRate}%</div>
                    <div className="text-xs text-foreground/50">win rate</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-foreground/40">No matches played yet</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
