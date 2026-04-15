import { supabase } from "./supabase";
import type { Match, MatchResult, Player, PlayerStats } from "./types";
import { getPoints } from "./types";

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function getLeaderboard(): Promise<PlayerStats[]> {
  const { data, error } = await supabase
    .from("match_results")
    .select("player_id, placement, match_id, players(id, name)");
  if (error) throw error;

  type ResultRow = { player_id: string; placement: number; match_id: string; players: Player };
  const results = (data ?? []) as ResultRow[];

  const matchPlayerCount = new Map<string, number>();
  for (const r of results) {
    matchPlayerCount.set(r.match_id, (matchPlayerCount.get(r.match_id) ?? 0) + 1);
  }

  const map = new Map<string, { player: Player; points: number; matches: number; wins: number }>();
  for (const r of results) {
    const playerCount = matchPlayerCount.get(r.match_id) ?? 4;
    const pts = getPoints(playerCount, r.placement);
    const existing = map.get(r.player_id);
    if (existing) {
      existing.points += pts;
      existing.matches += 1;
      if (r.placement === 1) existing.wins += 1;
    } else {
      map.set(r.player_id, {
        player: r.players,
        points: pts,
        matches: 1,
        wins: r.placement === 1 ? 1 : 0,
      });
    }
  }

  const sorted = [...map.values()].sort((a, b) => b.points - a.points);
  return sorted.map((entry, i) => ({
    player: entry.player,
    totalPoints: entry.points,
    matches: entry.matches,
    wins: entry.wins,
    winRate: entry.matches > 0 ? Math.round((entry.wins / entry.matches) * 100) : 0,
    rank: i + 1,
  }));
}

export type MatchWithResults = Match & {
  results: Array<MatchResult & { player: Player }>;
};

export async function getMatchById(matchId: string): Promise<MatchWithResults | null> {
  const { data: matchData, error: mErr } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (mErr) return null;
  const match = matchData as Match;

  const { data: resultData, error: rErr } = await supabase
    .from("match_results")
    .select("*, players(id, name)")
    .eq("match_id", matchId)
    .order("placement");
  if (rErr) return null;

  type RawResult = MatchResult & { players: Player };
  const results = (resultData ?? []) as RawResult[];

  return { ...match, results: results.map((r) => ({ ...r, player: r.players })) };
}

export async function getRecentMatches(limit = 5): Promise<MatchWithResults[]> {
  const { data: matchData, error: mErr } = await supabase
    .from("matches")
    .select("*")
    .order("played_at", { ascending: false })
    .limit(limit);
  if (mErr) throw mErr;
  const matches = (matchData ?? []) as Match[];
  if (!matches.length) return [];

  const ids = matches.map((m) => m.id);
  const { data: resultData, error: rErr } = await supabase
    .from("match_results")
    .select("*, players(id, name)")
    .in("match_id", ids)
    .order("placement");
  if (rErr) throw rErr;

  type RawResult = MatchResult & { players: Player };
  const results = (resultData ?? []) as RawResult[];

  return matches.map((match) => ({
    ...match,
    results: results
      .filter((r) => r.match_id === match.id)
      .map((r) => ({ ...r, player: r.players })),
  }));
}

export async function getAllMatches(): Promise<MatchWithResults[]> {
  const { data: matchData, error: mErr } = await supabase
    .from("matches")
    .select("*")
    .order("played_at", { ascending: false });
  if (mErr) throw mErr;
  const matches = (matchData ?? []) as Match[];
  if (!matches.length) return [];

  const { data: resultData, error: rErr } = await supabase
    .from("match_results")
    .select("*, players(id, name)")
    .order("placement");
  if (rErr) throw rErr;

  type RawResult = MatchResult & { players: Player };
  const results = (resultData ?? []) as RawResult[];

  return matches.map((match) => ({
    ...match,
    results: results
      .filter((r) => r.match_id === match.id)
      .map((r) => ({ ...r, player: r.players })),
  }));
}

export type PlayerResultRow = MatchResult & {
  matches: Match;
  playerCount: number;
  wasLast: boolean;
};

export async function getPlayerWithStats(playerId: string) {
  const { data: playerData, error: pErr } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();
  if (pErr) throw pErr;
  const player = playerData as Player;

  const { data: resultData, error: rErr } = await supabase
    .from("match_results")
    .select("*, matches(id, played_at, notes)")
    .eq("player_id", playerId)
    .order("matches(played_at)", { ascending: false });
  if (rErr) throw rErr;

  type RawRow = MatchResult & { matches: Match };
  const rawResults = (resultData ?? []) as RawRow[];

  const matchIds = rawResults.map((r) => r.match_id);
  const matchPlayerCount = new Map<string, number>();
  if (matchIds.length > 0) {
    const { data: countData } = await supabase
      .from("match_results")
      .select("match_id")
      .in("match_id", matchIds);
    for (const r of (countData ?? []) as { match_id: string }[]) {
      matchPlayerCount.set(r.match_id, (matchPlayerCount.get(r.match_id) ?? 0) + 1);
    }
  }

  const results: PlayerResultRow[] = rawResults.map((r) => {
    const playerCount = matchPlayerCount.get(r.match_id) ?? 4;
    return { ...r, playerCount, wasLast: r.placement === playerCount };
  });

  const totalPoints = results.reduce((sum, r) => sum + getPoints(r.playerCount, r.placement), 0);
  const wins = results.filter((r) => r.placement === 1).length;
  const winRate = results.length > 0 ? Math.round((wins / results.length) * 100) : 0;

  const leaderboard = await getLeaderboard();
  const rank = leaderboard.find((s) => s.player.id === playerId)?.rank ?? null;

  return { player, stats: { totalPoints, matches: results.length, wins, winRate, rank }, results };
}
