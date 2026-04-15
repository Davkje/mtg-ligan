export type Database = {
  public: {
    Tables: {
      players: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
      };
      matches: {
        Row: { id: string; played_at: string; notes: string | null };
        Insert: { id?: string; played_at: string; notes?: string | null };
        Update: { id?: string; played_at?: string; notes?: string | null };
      };
      match_results: {
        Row: { id: string; match_id: string; player_id: string; placement: 1 | 2 | 3 | 4 | 5 };
        Insert: { id?: string; match_id: string; player_id: string; placement: 1 | 2 | 3 | 4 | 5 };
        Update: { id?: string; match_id?: string; player_id?: string; placement?: 1 | 2 | 3 | 4 | 5 };
      };
    };
  };
};

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

// Points per placement, indexed by player count
export const POINTS_TABLE: Record<number, number[]> = {
  3: [80, 60, 40],
  4: [100, 75, 50, 25],
  5: [120, 90, 60, 30, 15],
};

export function getPoints(playerCount: number, placement: number): number {
  const table = POINTS_TABLE[playerCount] ?? POINTS_TABLE[4];
  return table[placement - 1] ?? 0;
}

export type PlayerStats = {
  player: Player;
  totalPoints: number;
  matches: number;
  wins: number;
  winRate: number;
  rank: number | null;
};
