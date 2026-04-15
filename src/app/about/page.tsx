import { POINTS_TABLE } from "@/lib/types";

const achievements = [
  { icon: "🏆", name: "One of Every Kind", description: "Has won, come 2nd, come 3rd, and finished last at least once." },
  { icon: "😈", name: "Fallen from Grace", description: "Won 2+ matches in a row, then finished last in the next." },
  { icon: "💪", name: "The Underdog", description: "Won a match after finishing last 3+ times in a row." },
  { icon: "🔒", name: "Consistency is Key", description: "Did not finish last in 5 consecutive matches." },
  { icon: "⚡", name: "Hot Streak", description: "Won 3 matches in a row." },
];

const placements = ["1st", "2nd", "3rd", "4th", "5th"];

export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">About the League</h1>
        <p className="text-foreground/60">
          A private Commander league tracking wins, losses, and glory across every session.
          Matches support 3–5 players with a dynamic scoring system that rewards larger tables.
        </p>
      </div>

      {/* Point system */}
      <section>
        <h2 className="text-xl font-bold mb-4">Point System</h2>
        <p className="text-sm text-foreground/60 mb-4">
          Points scale with the number of players at the table. More players = higher stakes = more points.
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-foreground/60 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Placement</th>
                <th className="px-4 py-3 text-right">3 Players</th>
                <th className="px-4 py-3 text-right">4 Players</th>
                <th className="px-4 py-3 text-right">5 Players</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {placements.map((label, i) => {
                const p3 = POINTS_TABLE[3][i];
                const p4 = POINTS_TABLE[4][i];
                const p5 = POINTS_TABLE[5][i];
                if (p3 === undefined && p4 === undefined && p5 === undefined) return null;
                return (
                  <tr key={label} className={i === 0 ? "bg-accent/5" : "hover:bg-surface transition-colors"}>
                    <td className="px-4 py-3 font-semibold">{label}</td>
                    <td className="px-4 py-3 text-right text-foreground/70">
                      {p3 !== undefined ? `${p3} pts` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground/70">
                      {p4 !== undefined ? `${p4} pts` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-accent">
                      {p5 !== undefined ? `${p5} pts` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-foreground/40 mt-2">
          Multipliers: 3 players = 0.8×, 4 players = 1.0× (base), 5 players = 1.2×
        </p>
      </section>

      {/* Rules */}
      <section>
        <h2 className="text-xl font-bold mb-4">Rules</h2>
        <ul className="space-y-2 text-sm text-foreground/70">
          <li className="flex gap-2">
            <span className="text-accent shrink-0">→</span>
            Each match must have 3–5 players with unique placements (1st through last).
          </li>
          <li className="flex gap-2">
            <span className="text-accent shrink-0">→</span>
            Matches are registered by an admin using the password-protected Register page.
          </li>
          <li className="flex gap-2">
            <span className="text-accent shrink-0">→</span>
            Points accumulate over the full season. The leaderboard ranks by total points.
          </li>
          <li className="flex gap-2">
            <span className="text-accent shrink-0">→</span>
            In case of a tie in total points, the player with more wins ranks higher.
          </li>
          <li className="flex gap-2">
            <span className="text-accent shrink-0">→</span>
            Mistakes in match entry can be corrected via the History page using the master password.
          </li>
        </ul>
      </section>

      {/* Achievements */}
      <section>
        <h2 className="text-xl font-bold mb-4">Achievements</h2>
        <p className="text-sm text-foreground/60 mb-4">
          Achievements are calculated dynamically from match history. They appear on each player&apos;s profile page.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((a) => (
            <div
              key={a.name}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <span className="text-2xl shrink-0">{a.icon}</span>
              <div>
                <p className="font-semibold text-sm">{a.name}</p>
                <p className="text-xs text-foreground/60 mt-0.5">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
