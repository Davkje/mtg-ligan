import { supabase } from "./supabase";
import type { Commander, League, Match, MatchResult, Player, PlayerStats } from "./types";
import { getPointsForPlacement } from "./types";

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function getCommanders(): Promise<Commander[]> {
  const { data, error } = await supabase.from("commanders").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Commander[];
}

// Returns per-player commander IDs sorted by usage count (most used first)
export async function getPlayerCommanderUsage(): Promise<Record<string, string[]>> {
  const { data } = await supabase
    .from("match_results")
    .select("player_id, commander_id")
    .not("commander_id", "is", null);

  const usage = new Map<string, Map<string, number>>();
  for (const r of (data ?? []) as { player_id: string; commander_id: string }[]) {
    if (!r.commander_id) continue;
    if (!usage.has(r.player_id)) usage.set(r.player_id, new Map());
    const cm = usage.get(r.player_id)!;
    cm.set(r.commander_id, (cm.get(r.commander_id) ?? 0) + 1);
  }

  const result: Record<string, string[]> = {};
  for (const [playerId, cm] of usage) {
    result[playerId] = [...cm.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([commanderId]) => commanderId);
  }
  return result;
}

export type MatchSummary = {
  total: number;
  ranked: number;
  practice: number;
  lastWeek: number;
  byLeague: Map<string, number>;
  uniqueCommanders: number;
};

export async function getMatchSummary(leagues: League[]): Promise<MatchSummary> {
  const practiceIds = new Set(leagues.filter((l) => l.is_practice).map((l) => l.id));
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [matchData, cmdData] = await Promise.all([
    supabase.from("matches").select("id, played_at, league_id"),
    supabase.from("match_results").select("commander_id").not("commander_id", "is", null),
  ]);

  const matches = (matchData.data ?? []) as { id: string; played_at: string; league_id: string }[];
  const byLeague = new Map<string, number>();
  let ranked = 0;
  let practice = 0;
  let lastWeek = 0;

  for (const m of matches) {
    byLeague.set(m.league_id, (byLeague.get(m.league_id) ?? 0) + 1);
    if (practiceIds.has(m.league_id)) practice++;
    else ranked++;
    if (m.played_at >= weekAgo) lastWeek++;
  }

  const cmds = (cmdData.data ?? []) as { commander_id: string }[];
  const uniqueCommanders = new Set(cmds.map((c) => c.commander_id)).size;

  return { total: matches.length, ranked, practice, lastWeek, byLeague, uniqueCommanders };
}

export async function getLeagues(): Promise<League[]> {
  const { data, error } = await supabase.from("leagues").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as League[];
}

// Core leaderboard engine — computes standings for a given set of league IDs
async function computeLeaderboard(leagueIds: string[]): Promise<PlayerStats[]> {
  if (leagueIds.length === 0) return [];

  const { data: matchData } = await supabase
    .from("matches")
    .select("id")
    .in("league_id", leagueIds);
  const matchIds = ((matchData ?? []) as { id: string }[]).map((m) => m.id);
  if (matchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("match_results")
    .select("player_id, placement, match_id, players(id, name)")
    .in("match_id", matchIds);
  if (error) throw error;

  type ResultRow = { player_id: string; placement: number; match_id: string; players: Player };
  const results = (data ?? []) as ResultRow[];

  const matchPlayerCount = new Map<string, number>();
  const matchPlacements = new Map<string, number[]>();
  for (const r of results) {
    matchPlayerCount.set(r.match_id, (matchPlayerCount.get(r.match_id) ?? 0) + 1);
    const prev = matchPlacements.get(r.match_id) ?? [];
    prev.push(r.placement);
    matchPlacements.set(r.match_id, prev);
  }

  const map = new Map<string, { player: Player; points: number; matches: number; wins: number }>();
  for (const r of results) {
    const playerCount = matchPlayerCount.get(r.match_id) ?? 4;
    const allPlacements = matchPlacements.get(r.match_id) ?? [r.placement];
    const pts = getPointsForPlacement(allPlacements, r.placement, playerCount);
    const existing = map.get(r.player_id);
    if (existing) {
      existing.points += pts;
      existing.matches += 1;
      if (r.placement === 1) existing.wins += 1;
    } else {
      map.set(r.player_id, { player: r.players, points: pts, matches: 1, wins: r.placement === 1 ? 1 : 0 });
    }
  }

  // Favourite commander per player (within these matches)
  const { data: cmdData } = await supabase
    .from("match_results")
    .select("player_id, commanders(id, name)")
    .in("match_id", matchIds);

  type CmdRow = { player_id: string; commanders: Commander | null };
  const cmdCounts = new Map<string, Map<string, { commander: Commander; count: number }>>();
  for (const r of (cmdData ?? []) as CmdRow[]) {
    if (!r.commanders) continue;
    if (!cmdCounts.has(r.player_id)) cmdCounts.set(r.player_id, new Map());
    const pm = cmdCounts.get(r.player_id)!;
    const ex = pm.get(r.commanders.id);
    if (ex) ex.count++;
    else pm.set(r.commanders.id, { commander: r.commanders, count: 1 });
  }

  const sorted = [...map.values()].sort((a, b) => b.points - a.points);
  return sorted.map((entry, i) => ({
    player: entry.player,
    totalPoints: entry.points,
    matches: entry.matches,
    wins: entry.wins,
    winRate: entry.matches > 0 ? Math.round((entry.wins / entry.matches) * 100) : 0,
    rank: i + 1,
    favoriteCommander:
      [...(cmdCounts.get(entry.player.id)?.values() ?? [])].sort((a, b) => b.count - a.count)[0]?.commander ?? null,
  }));
}

// Overall leaderboard — all non-practice leagues combined
export async function getLeaderboard(): Promise<PlayerStats[]> {
  const leagues = await getLeagues();
  const leagueIds = leagues.filter((l) => !l.is_practice).map((l) => l.id);
  return computeLeaderboard(leagueIds);
}

// Standings for a single specific league
export async function getLeagueLeaderboard(leagueId: string): Promise<PlayerStats[]> {
  return computeLeaderboard([leagueId]);
}

export type MatchWithResults = Match & {
  league: League;
  results: Array<MatchResult & { player: Player; commander: Commander | null }>;
};

export async function getMatchById(matchId: string): Promise<MatchWithResults | null> {
  const { data: matchData, error: mErr } = await supabase
    .from("matches")
    .select("*, leagues(id, name, is_practice)")
    .eq("id", matchId)
    .single();
  if (mErr) return null;

  type RawMatch = Match & { leagues: League };
  const raw = matchData as RawMatch;
  const match = { ...raw, league: raw.leagues };

  const { data: resultData, error: rErr } = await supabase
    .from("match_results")
    .select("*, players(id, name), commanders(id, name)")
    .eq("match_id", matchId)
    .order("placement");
  if (rErr) return null;

  type RawResult = MatchResult & { players: Player; commanders: Commander | null };
  const results = (resultData ?? []) as RawResult[];

  return { ...match, results: results.map((r) => ({ ...r, player: r.players, commander: r.commanders })) };
}

async function fetchMatchesWithLeague(query: ReturnType<typeof supabase.from>): Promise<MatchWithResults[]> {
  // Shared helper — not used directly; see below
  return [];
}

export async function getRecentMatches(limit = 5): Promise<MatchWithResults[]> {
  const { data: matchData, error: mErr } = await supabase
    .from("matches")
    .select("*, leagues(id, name, is_practice)")
    .order("played_at", { ascending: false })
    .limit(limit);
  if (mErr) throw mErr;

  type RawMatch = Match & { leagues: League };
  const matches = ((matchData ?? []) as RawMatch[]).map((m) => ({ ...m, league: m.leagues }));
  if (!matches.length) return [];

  const ids = matches.map((m) => m.id);
  const { data: resultData, error: rErr } = await supabase
    .from("match_results")
    .select("*, players(id, name), commanders(id, name)")
    .in("match_id", ids)
    .order("placement");
  if (rErr) throw rErr;

  type RawResult = MatchResult & { players: Player; commanders: Commander | null };
  const results = (resultData ?? []) as RawResult[];

  return matches.map((match) => ({
    ...match,
    results: results
      .filter((r) => r.match_id === match.id)
      .map((r) => ({ ...r, player: r.players, commander: r.commanders })),
  }));
}

export async function getAllMatches(): Promise<MatchWithResults[]> {
  const { data: matchData, error: mErr } = await supabase
    .from("matches")
    .select("*, leagues(id, name, is_practice)")
    .order("played_at", { ascending: false });
  if (mErr) throw mErr;

  type RawMatch = Match & { leagues: League };
  const matches = ((matchData ?? []) as RawMatch[]).map((m) => ({ ...m, league: m.leagues }));
  if (!matches.length) return [];

  const { data: resultData, error: rErr } = await supabase
    .from("match_results")
    .select("*, players(id, name), commanders(id, name)")
    .order("placement");
  if (rErr) throw rErr;

  type RawResult = MatchResult & { players: Player; commanders: Commander | null };
  const results = (resultData ?? []) as RawResult[];

  return matches.map((match) => ({
    ...match,
    results: results
      .filter((r) => r.match_id === match.id)
      .map((r) => ({ ...r, player: r.players, commander: r.commanders })),
  }));
}

export type PlayerResultRow = MatchResult & {
  matches: Match & { league: League };
  playerCount: number;
  wasLast: boolean;
  commander: Commander | null;
  allPlacements: number[];
};

export type LeagueStanding = {
  league: League;
  rank: number | null;
  totalPoints: number;
  matches: number;
  wins: number;
  winRate: number;
};

export type PlayerPageData = {
  player: Player;
  leagueStandings: LeagueStanding[];
  overallStats: { totalPoints: number; matches: number; wins: number; winRate: number };
  practiceStats: { matches: number; wins: number };
  favoriteCommander: Commander | null;
  results: PlayerResultRow[];
};

export async function getPlayerWithStats(playerId: string): Promise<PlayerPageData> {
  const { data: playerData, error: pErr } = await supabase
    .from("players").select("*").eq("id", playerId).single();
  if (pErr) throw pErr;
  const player = playerData as Player;

  const { data: resultData, error: rErr } = await supabase
    .from("match_results")
    .select("*, matches(id, played_at, notes, league_id, leagues(id, name, is_practice)), commanders(id, name)")
    .eq("player_id", playerId)
    .order("matches(played_at)", { ascending: false });
  if (rErr) throw rErr;

  type RawRow = MatchResult & {
    matches: Match & { leagues: League };
    commanders: Commander | null;
  };
  const rawResults = (resultData ?? []) as RawRow[];

  const matchIds = rawResults.map((r) => r.match_id);
  const matchPlayerCount = new Map<string, number>();
  const matchPlacements = new Map<string, number[]>();

  if (matchIds.length > 0) {
    const { data: countData } = await supabase
      .from("match_results").select("match_id, placement").in("match_id", matchIds);
    for (const r of (countData ?? []) as { match_id: string; placement: number }[]) {
      matchPlayerCount.set(r.match_id, (matchPlayerCount.get(r.match_id) ?? 0) + 1);
      const prev = matchPlacements.get(r.match_id) ?? [];
      prev.push(r.placement);
      matchPlacements.set(r.match_id, prev);
    }
  }

  const results: PlayerResultRow[] = rawResults.map((r) => {
    const playerCount = matchPlayerCount.get(r.match_id) ?? 4;
    const allPlacements = matchPlacements.get(r.match_id) ?? [r.placement];
    return {
      ...r,
      matches: { ...r.matches, league: r.matches.leagues },
      playerCount,
      wasLast: r.placement === Math.max(...allPlacements),
      commander: r.commanders,
      allPlacements,
    };
  });

  // Separate practice vs competitive results
  const compResults = results.filter((r) => !r.matches.league.is_practice);
  const practiceResults = results.filter((r) => r.matches.league.is_practice);

  // Overall competitive stats (all non-practice leagues combined)
  const overallPoints = compResults.reduce(
    (sum, r) => sum + getPointsForPlacement(r.allPlacements, r.placement, r.playerCount), 0,
  );
  const overallWins = compResults.filter((r) => r.placement === 1).length;
  const overallWinRate = compResults.length > 0 ? Math.round((overallWins / compResults.length) * 100) : 0;

  const practiceWins = practiceResults.filter((r) => r.placement === 1).length;

  // Per-league standings (only leagues the player has played in)
  const playedLeagueIds = [...new Set(compResults.map((r) => r.matches.league_id))];
  const leagueStandings: LeagueStanding[] = [];

  for (const leagueId of playedLeagueIds) {
    const lb = await getLeagueLeaderboard(leagueId);
    const standing = lb.find((s) => s.player.id === playerId);
    const league = compResults.find((r) => r.matches.league_id === leagueId)?.matches.league;
    if (standing && league) {
      leagueStandings.push({ league, ...standing });
    }
  }

  // Sort league standings by most recent activity (order of playedLeagueIds)
  leagueStandings.sort((a, b) => playedLeagueIds.indexOf(a.league.id) - playedLeagueIds.indexOf(b.league.id));

  // Favourite commander — most used across all games
  const commanderCounts = new Map<string, { commander: Commander; count: number }>();
  for (const r of results) {
    if (r.commander) {
      const entry = commanderCounts.get(r.commander.id);
      if (entry) entry.count++;
      else commanderCounts.set(r.commander.id, { commander: r.commander, count: 1 });
    }
  }
  const favoriteCommander =
    [...commanderCounts.values()].sort((a, b) => b.count - a.count)[0]?.commander ?? null;

  return {
    player,
    leagueStandings,
    overallStats: {
      totalPoints: overallPoints,
      matches: compResults.length,
      wins: overallWins,
      winRate: overallWinRate,
    },
    practiceStats: { matches: practiceResults.length, wins: practiceWins },
    favoriteCommander,
    results,
  };
}
