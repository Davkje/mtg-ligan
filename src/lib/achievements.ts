export type Achievement = {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
};

export type GameResult = {
  placement: number;
  wasLast: boolean;
};

// results should be in chronological order (oldest first)
export function computeAchievements(results: GameResult[]): Achievement[] {
  return [
    {
      id: "one_of_every_kind",
      icon: "🏆",
      name: "One of Every Kind",
      description: "Has won, come 2nd, come 3rd, and finished last at least once.",
      unlocked: oneOfEveryKind(results),
    },
    {
      id: "fallen_from_grace",
      icon: "😈",
      name: "Fallen from Grace",
      description: "Won 2+ matches in a row, then finished last.",
      unlocked: fallenFromGrace(results),
    },
    {
      id: "the_underdog",
      icon: "💪",
      name: "The Underdog",
      description: "Won a match after finishing last 3+ times in a row.",
      unlocked: theUnderdog(results),
    },
    {
      id: "consistency_is_key",
      icon: "🔒",
      name: "Consistency is Key",
      description: "Did not finish last in 5 matches in a row.",
      unlocked: consistencyIsKey(results),
    },
    {
      id: "hot_streak",
      icon: "⚡",
      name: "Hot Streak",
      description: "Won 3 matches in a row.",
      unlocked: hotStreak(results),
    },
  ];
}

function oneOfEveryKind(results: GameResult[]): boolean {
  const placements = results.map((r) => r.placement);
  return (
    placements.includes(1) &&
    placements.includes(2) &&
    placements.includes(3) &&
    results.some((r) => r.wasLast)
  );
}

function fallenFromGrace(results: GameResult[]): boolean {
  let streak = 0;
  for (const r of results) {
    if (r.placement === 1) {
      streak++;
    } else {
      if (streak >= 2 && r.wasLast) return true;
      streak = 0;
    }
  }
  return false;
}

function theUnderdog(results: GameResult[]): boolean {
  let lastStreak = 0;
  for (const r of results) {
    if (r.wasLast) {
      lastStreak++;
    } else if (r.placement === 1) {
      if (lastStreak >= 3) return true;
      lastStreak = 0;
    } else {
      lastStreak = 0;
    }
  }
  return false;
}

function consistencyIsKey(results: GameResult[]): boolean {
  if (results.length < 5) return false;
  let streak = 0;
  for (const r of results) {
    if (!r.wasLast) {
      streak++;
      if (streak >= 5) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}

function hotStreak(results: GameResult[]): boolean {
  let streak = 0;
  for (const r of results) {
    if (r.placement === 1) {
      streak++;
      if (streak >= 3) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}

// Convert DB results (newest first) to chronological order for achievement calculation
export function toChronological<T extends { wasLast: boolean; placement: number }>(
  results: T[]
): GameResult[] {
  return [...results].reverse().map((r) => ({
    placement: r.placement,
    wasLast: r.wasLast,
  }));
}
