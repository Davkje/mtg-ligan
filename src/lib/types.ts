export type Database = {
  public: {
    Tables: {
      players: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
      };
      matches: {
        Row: { id: string; played_at: string };
        Insert: { id?: string; played_at: string };
        Update: { id?: string; played_at?: string };
      };
      match_results: {
        Row: { id: string; match_id: string; player_id: string; placement: 1 | 2 | 3 | 4 };
        Insert: { id?: string; match_id: string; player_id: string; placement: 1 | 2 | 3 | 4 };
        Update: { id?: string; match_id?: string; player_id?: string; placement?: 1 | 2 | 3 | 4 };
      };
    };
  };
};

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

export const POINTS: Record<1 | 2 | 3 | 4, number> = {
  1: 100,
  2: 50,
  3: 25,
  4: 10,
};

export type PlayerStats = {
  player: Player;
  totalPoints: number;
  matches: number;
  wins: number;
  winRate: number;
  rank: number;
};
