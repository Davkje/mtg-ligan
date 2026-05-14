import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/types";

type InsertRow = Database["public"]["Tables"]["match_results"]["Insert"];
type MatchEntry = { playerId: string; placement: number; commanderId?: string | null };

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "1") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playedAt, entries, notes, leagueId } = (await request.json()) as {
    playedAt: string;
    entries: MatchEntry[];
    notes?: string;
    leagueId: string;
  };

  if (!leagueId) {
    return Response.json({ error: "League is required." }, { status: 400 });
  }

  const n = entries.length;
  if (n < 3 || n > 5) {
    return Response.json({ error: "Match must have 3–5 players." }, { status: 400 });
  }

  // Validate placements: all between 1 and n, must include 1, no duplicate player IDs
  const placements = entries.map((e) => e.placement);
  if (placements.some((p) => p < 1 || p > n)) {
    return Response.json({ error: `Placements must be between 1 and ${n}.` }, { status: 400 });
  }
  if (!placements.includes(1)) {
    return Response.json({ error: "At least one player must be in 1st place." }, { status: 400 });
  }
  const playerIds = entries.map((e) => e.playerId);
  if (new Set(playerIds).size !== n) {
    return Response.json({ error: "Each player can only appear once." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: match, error: mErr } = await (supabase.from("matches") as any)
    .insert({ played_at: playedAt, notes: notes?.trim() || null, league_id: leagueId })
    .select()
    .single();

  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  const rows: InsertRow[] = entries.map((e) => ({
    match_id: (match as { id: string }).id,
    player_id: e.playerId,
    placement: e.placement as InsertRow["placement"],
    commander_id: e.commanderId || null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rErr } = await (supabase.from("match_results") as any).insert(rows);
  if (rErr) return Response.json({ error: rErr.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/register");

  return Response.json({ ok: true, matchId: (match as { id: string }).id });
}
