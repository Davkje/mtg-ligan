import Link from "next/link";
import { getLeaderboard, getRecentMatches } from "@/lib/data";
import { POINTS } from "@/lib/types";

const PLACEMENT_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
};

export default async function HomePage() {
  const [leaderboard, recentMatches] = await Promise.all([
    getLeaderboard(),
    getRecentMatches(5),
  ]);

  return (
    <div className="space-y-10">
      {/* Leaderboard */}
      <section>
        <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-foreground/60 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Matches</th>
                <th className="px-4 py-3 text-right">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaderboard.map((entry, i) => (
                <tr
                  key={entry.player.id}
                  className={i === 0 ? "bg-accent/10" : "hover:bg-surface transition-colors"}
                >
                  <td className="px-4 py-3 font-mono text-foreground/50">
                    {i === 0 ? "👑" : `#${entry.rank}`}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      href={`/player/${entry.player.id}`}
                      className="hover:text-accent transition-colors"
                    >
                      {entry.player.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-accent">
                    {entry.totalPoints}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground/70">{entry.matches}</td>
                  <td className="px-4 py-3 text-right text-foreground/70">{entry.winRate}%</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-foreground/40">
                    No matches played yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent matches */}
      <section>
        <h2 className="text-xl font-bold mb-4">Recent Matches</h2>
        {recentMatches.length === 0 ? (
          <p className="text-foreground/40 text-sm">No matches yet.</p>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match) => (
              <div key={match.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs text-foreground/50 mb-3">
                  {new Date(match.played_at).toLocaleDateString("sv-SE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {match.results.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded p-2 text-center text-sm ${
                        r.placement === 1
                          ? "bg-accent/20 border border-accent/40"
                          : "bg-background/60"
                      }`}
                    >
                      <div className="text-xs text-foreground/50 mb-0.5">
                        {PLACEMENT_LABEL[r.placement as 1 | 2 | 3 | 4]}
                      </div>
                      <Link
                        href={`/player/${r.player.id}`}
                        className="font-semibold hover:text-accent transition-colors"
                      >
                        {r.player.name}
                      </Link>
                      <div className="text-xs text-accent mt-0.5">
                        +{POINTS[r.placement as 1 | 2 | 3 | 4]} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
