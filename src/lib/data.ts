import { supabase } from "./supabase";
import type { Match, MatchResult, Player, PlayerStats } from "./types";
import { POINTS } from "./types";

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function getLeaderboard(): Promise<PlayerStats[]> {
  const { data: results, error } = await supabase
    .from("match_results")
    .select("player_id, placement, players(id, name)");
  if (error) throw error;

  const map = new Map<string, { player: Player; points: number; matches: number; wins: number }>();

  for (const r of results as Array<{ player_id: string; placement: 1 | 2 | 3 | 4; players: Player }>) {
    const existing = map.get(r.player_id);
    if (existing) {
      existing.points += POINTS[r.placement];
      existing.matches += 1;
      if (r.placement === 1) existing.wins += 1;
    } else {
      map.set(r.player_id, {
        player: r.players,
        points: POINTS[r.placement],
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

export async function getRecentMatches(limit = 5): Promise<MatchWithResults[]> {
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("*")
    .order("played_at", { ascending: false })
    .limit(limit);
  if (mErr) throw mErr;
  if (!matches?.length) return [];

  const ids = matches.map((m) => m.id);
  const { data: results, error: rErr } = await supabase
    .from("match_results")
    .select("*, players(id, name)")
    .in("match_id", ids)
    .order("placement");
  if (rErr) throw rErr;

  return matches.map((match) => ({
    ...match,
    results: (results as Array<MatchResult & { players: Player }>)
      .filter((r) => r.match_id === match.id)
      .map((r) => ({ ...r, player: r.players })),
  }));
}

export async function getAllMatches(): Promise<MatchWithResults[]> {
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("*")
    .order("played_at", { ascending: false });
  if (mErr) throw mErr;
  if (!matches?.length) return [];

  const { data: results, error: rErr } = await supabase
    .from("match_results")
    .select("*, players(id, name)")
    .order("placement");
  if (rErr) throw rErr;

  return matches.map((match) => ({
    ...match,
    results: (results as Array<MatchResult & { players: Player }>)
      .filter((r) => r.match_id === match.id)
      .map((r) => ({ ...r, player: r.players })),
  }));
}

export async function getPlayerWithStats(playerId: string) {
  const { data: player, error: pErr } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();
  if (pErr) throw pErr;

  const { data: results, error: rErr } = await supabase
    .from("match_results")
    .select("*, matches(id, played_at)")
    .eq("player_id", playerId)
    .order("matches(played_at)", { ascending: false });
  if (rErr) throw rErr;

  type ResultRow = MatchResult & { matches: Match };
  const typedResults = results as ResultRow[];

  const totalPoints = typedResults.reduce((sum, r) => sum + POINTS[r.placement], 0);
  const wins = typedResults.filter((r) => r.placement === 1).length;
  const winRate = typedResults.length > 0 ? Math.round((wins / typedResults.length) * 100) : 0;

  // Calculate rank from leaderboard
  const leaderboard = await getLeaderboard();
  const rank = leaderboard.find((s) => s.player.id === playerId)?.rank ?? null;

  return {
    player,
    stats: {
      totalPoints,
      matches: typedResults.length,
      wins,
      winRate,
      rank,
    },
    results: typedResults,
  };
}
