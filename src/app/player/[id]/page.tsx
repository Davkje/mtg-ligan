import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlayerWithStats } from "@/lib/data";
import { computeAchievements, toChronological } from "@/lib/achievements";
import { getPoints } from "@/lib/types";

const PLACEMENT_LABEL: Record<number, string> = {
  1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th",
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getPlayerWithStats(id);
  } catch {
    notFound();
  }

  const { player, stats, results } = data;
  const achievements = computeAchievements(toChronological(results));
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/" className="text-sm text-foreground/50 hover:text-accent transition-colors">
          ← Leaderboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">{player.name}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Rank", value: stats.rank ? `#${stats.rank}` : "—" },
          { label: "Total Points", value: stats.totalPoints.toLocaleString() },
          { label: "Matches", value: stats.matches },
          { label: "Win Rate", value: `${stats.winRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-4 text-center">
            <div className="text-2xl font-bold text-accent">{value}</div>
            <div className="text-xs text-foreground/50 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <section>
        <h2 className="text-xl font-bold mb-3">Achievements</h2>
        {achievements.length === 0 ? (
          <p className="text-foreground/40 text-sm">No matches yet.</p>
        ) : (
          <div className="space-y-4">
            {unlocked.length > 0 && (
              <div>
                <p className="text-xs text-foreground/50 uppercase tracking-wider mb-2">Unlocked</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unlocked.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 p-3"
                    >
                      <span className="text-2xl">{a.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{a.name}</p>
                        <p className="text-xs text-foreground/60">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {locked.length > 0 && (
              <div>
                <p className="text-xs text-foreground/50 uppercase tracking-wider mb-2">Locked</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {locked.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 opacity-50"
                    >
                      <span className="text-2xl grayscale">{a.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{a.name}</p>
                        <p className="text-xs text-foreground/60">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Match history */}
      <section>
        <h2 className="text-xl font-bold mb-3">Match History</h2>
        {results.length === 0 ? (
          <p className="text-foreground/40 text-sm">No matches played yet.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface text-foreground/60 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Placement</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Players</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-foreground/70">
                      {new Date(r.matches.played_at).toLocaleDateString("sv-SE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                          r.placement === 1
                            ? "bg-accent/20 text-accent"
                            : r.wasLast
                            ? "bg-red-900/20 text-red-400"
                            : "bg-surface text-foreground/70"
                        }`}
                      >
                        {PLACEMENT_LABEL[r.placement]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-foreground/40 text-xs hidden sm:table-cell">
                      {r.playerCount}p
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-accent">
                      +{getPoints(r.playerCount, r.placement)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
