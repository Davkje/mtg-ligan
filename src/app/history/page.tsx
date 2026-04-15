import Link from "next/link";
import { getAllMatches } from "@/lib/data";
import { POINTS } from "@/lib/types";

const PLACEMENT_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
};

export default async function HistoryPage() {
  const matches = await getAllMatches();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Match History</h1>

      {matches.length === 0 ? (
        <p className="text-foreground/40 text-sm">No matches recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {matches.map((match, idx) => (
            <div key={match.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">
                  {new Date(match.played_at).toLocaleDateString("sv-SE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <span className="text-xs text-foreground/40">
                  Match #{matches.length - idx}
                </span>
              </div>
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
    </div>
  );
}
