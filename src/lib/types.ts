export type Database = {
  public: {
    Tables: {
      players: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
      };
      commanders: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
      };
      leagues: {
        Row: { id: string; name: string; is_practice: boolean };
        Insert: { id?: string; name: string; is_practice?: boolean };
        Update: { id?: string; name?: string; is_practice?: boolean };
      };
      matches: {
        Row: { id: string; played_at: string; notes: string | null; league_id: string };
        Insert: { id?: string; played_at: string; notes?: string | null; league_id: string };
        Update: { id?: string; played_at?: string; notes?: string | null; league_id?: string };
      };
      match_results: {
        Row: { id: string; match_id: string; player_id: string; placement: 1 | 2 | 3 | 4 | 5; commander_id: string | null };
        Insert: { id?: string; match_id: string; player_id: string; placement: 1 | 2 | 3 | 4 | 5; commander_id?: string | null };
        Update: { id?: string; match_id?: string; player_id?: string; placement?: 1 | 2 | 3 | 4 | 5; commander_id?: string | null };
      };
    };
  };
};

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Commander = Database["public"]["Tables"]["commanders"]["Row"];
export type League = Database["public"]["Tables"]["leagues"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

export const POINTS_TABLE: Record<number, number[]> = {
  3: [80, 60, 40],
  4: [100, 75, 50, 25],
  5: [120, 90, 60, 30, 15],
};

export function getPoints(playerCount: number, placement: number): number {
  const table = POINTS_TABLE[playerCount] ?? POINTS_TABLE[4];
  return table[placement - 1] ?? 0;
}

export function getPointsForPlacement(
  allPlacements: number[],
  placement: number,
  playerCount: number,
): number {
  const pts = POINTS_TABLE[playerCount] ?? POINTS_TABLE[4];
  const sorted = [...allPlacements].sort((a, b) => a - b);
  const firstIdx = sorted.indexOf(placement);
  const lastIdx = sorted.lastIndexOf(placement);
  const count = lastIdx - firstIdx + 1;
  let total = 0;
  for (let i = firstIdx; i <= lastIdx; i++) total += pts[i] ?? 0;
  return Math.round(total / count);
}

export type PlayerStats = {
  player: Player;
  totalPoints: number;
  matches: number;
  wins: number;
  winRate: number;
  rank: number | null;
  favoriteCommander: Commander | null;
};
