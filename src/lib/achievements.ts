import type { MatchResult } from "./types";

export type Achievement = {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
};

// placements should be in chronological order (oldest first)
export function computeAchievements(placements: (1 | 2 | 3 | 4)[]): Achievement[] {
  return [
    {
      id: "one_of_every_kind",
      icon: "🏆",
      name: "One of Every Kind",
      description: "Received all 4 placements (1st–4th) at least once.",
      unlocked: [1, 2, 3, 4].every((p) => placements.includes(p as 1 | 2 | 3 | 4)),
    },
    {
      id: "fallen_from_grace",
      icon: "😈",
      name: "Fallen from Grace",
      description: "Won 2+ matches in a row, then came last.",
      unlocked: fallenFromGrace(placements),
    },
    {
      id: "the_underdog",
      icon: "💪",
      name: "The Underdog",
      description: "Won a match after 3+ consecutive losses (4th place).",
      unlocked: theUnderdog(placements),
    },
    {
      id: "consistency_is_key",
      icon: "🔒",
      name: "Consistency is Key",
      description: "No last-place finish in 5 matches in a row.",
      unlocked: consistencyIsKey(placements),
    },
    {
      id: "hot_streak",
      icon: "⚡",
      name: "Hot Streak",
      description: "Won 3 matches in a row.",
      unlocked: hotStreak(placements),
    },
  ];
}

function fallenFromGrace(placements: (1 | 2 | 3 | 4)[]): boolean {
  let streak = 0;
  for (let i = 0; i < placements.length; i++) {
    if (placements[i] === 1) {
      streak++;
    } else {
      if (streak >= 2 && placements[i] === 4) return true;
      streak = 0;
    }
  }
  return false;
}

function theUnderdog(placements: (1 | 2 | 3 | 4)[]): boolean {
  let losses = 0;
  for (const p of placements) {
    if (p === 4) {
      losses++;
    } else if (p === 1) {
      if (losses >= 3) return true;
      losses = 0;
    } else {
      losses = 0;
    }
  }
  return false;
}

function consistencyIsKey(placements: (1 | 2 | 3 | 4)[]): boolean {
  if (placements.length < 5) return false;
  let streak = 0;
  for (const p of placements) {
    if (p !== 4) {
      streak++;
      if (streak >= 5) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}

function hotStreak(placements: (1 | 2 | 3 | 4)[]): boolean {
  let streak = 0;
  for (const p of placements) {
    if (p === 1) {
      streak++;
      if (streak >= 3) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}

// Helper: given raw match_results rows (newest first from DB), reverse to chrono order
export function placementsChronological(results: Pick<MatchResult, "placement">[]): (1 | 2 | 3 | 4)[] {
  return [...results].reverse().map((r) => r.placement as 1 | 2 | 3 | 4);
}
