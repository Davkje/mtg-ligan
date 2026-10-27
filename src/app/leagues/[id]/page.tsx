export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeagues, getLeagueLeaderboard, getLeagueMatches } from "@/lib/data";
import { getPointsForPlacement } from "@/lib/types";
import { RiArrowLeftLine, RiStarFill, RiTrophyFill, RiTrophyLine, RiGamepadLine } from "@remixicon/react";

const PLACEMENT_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const leagues = await getLeagues();
  const league = leagues.find((l) => l.id === id);
  if (!league) notFound();

  const [leaderboard, matches] = await Promise.all([
    league.is_practice ? Promise.resolve([]) : getLeagueLeaderboard(id),
    getLeagueMatches(id, 10),
  ]);

  const winner = league.is_closed
    ? leaderboard.find((s) => s.player.id === league.winner_id)?.player ?? null
    : null;

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/leagues"
          className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition-colors mb-4"
        >
          <RiArrowLeftLine size={14} />
          All leagues
        </Link>
        <div className="flex items-center gap-3">
          {league.is_practice ? (
            <RiGamepadLine size={20} className="text-foreground/40" />
          ) : (
            <RiTrophyLine size={20} className="text-accent" />
          )}
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              league.is_practice
                ? "border-border text-foreground/40"
                : "border-accent/40 bg-accent/10 text-accent"
            }`}
          >
            {league.is_practice ? "Practice" : "Official"}
          </span>
          {league.is_closed && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border text-foreground/50">
              Completed
            </span>
          )}
        </div>
        {winner && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
            <RiTrophyFill size={22} className="text-accent" />
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/50">League winner</p>
              <Link href={`/player/${winner.id}`} className="font-bold hover:text-accent transition-colors">
                {winner.name}
              </Link>
            </div>
          </div>
        )}
        {league.is_practice && (
          <p className="text-sm text-foreground/40 mt-2">
            Practice games track personal stats but don&apos;t count toward the overall standings.
          </p>
        )}
      </div>

      {/* Leaderboard — official leagues only */}
      {!league.is_practice && (
        <section>
          <h2 className="text-xl font-bold mb-4">{league.is_closed ? "Final Standings" : "Standings"}</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full bg-background/90 text-sm">
              <thead className="bg-surface text-foreground/60 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-center">Points</th>
                  <th className="px-4 py-3 text-center">Matches</th>
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
                      {i === 0 ? (
                        <div className="flex gap-1 items-center">
                          <span>#1</span>
                          <RiStarFill size={14} className="text-accent" />
                        </div>
                      ) : (
                        `#${entry.rank}`
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/player/${entry.player.id}`} className="hover:text-accent transition-colors">
                        {entry.player.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-accent">{entry.totalPoints}</td>
                    <td className="px-4 py-3 text-center text-foreground/70">{entry.matches}</td>
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
      )}

      {/* Recent matches */}
      <section>
        <h2 className="text-xl font-bold mb-4">Recent Matches</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-foreground/40">No matches yet.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const playerCount = match.results.length;
              return (
                <Link
                  key={match.id}
                  href={`/match/${match.id}`}
                  className="block rounded-lg border border-border bg-background/60 hover:bg-surface transition-colors px-4 py-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-foreground/40">
                      {new Date(match.played_at).toLocaleDateString("sv-SE")}
                    </span>
                    <span className="text-xs text-foreground/30">{playerCount} players</span>
                  </div>
                  <div className="space-y-1">
                    {match.results.map((r) => {
                      const allPlacements = match.results.map((x) => x.placement);
                      const pts = getPointsForPlacement(allPlacements, r.placement, playerCount);
                      return (
                        <div key={r.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-foreground/40 w-6">{PLACEMENT_LABEL[r.placement]}</span>
                            <span className={r.placement === 1 ? "font-semibold" : ""}>{r.player.name}</span>
                            {r.commander && (
                              <span className="text-xs text-foreground/40 truncate max-w-32">{r.commander.name}</span>
                            )}
                          </div>
                          {!league.is_practice && (
                            <span className="text-xs text-accent font-medium">+{pts}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
