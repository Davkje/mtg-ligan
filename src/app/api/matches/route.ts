import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/types";

type InsertRow = Database["public"]["Tables"]["match_results"]["Insert"];
type MatchEntry = { playerId: string; placement: number };

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "1") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playedAt, entries, notes } = (await request.json()) as {
    playedAt: string;
    entries: MatchEntry[];
    notes?: string;
  };

  const n = entries.length;
  if (n < 3 || n > 5) {
    return Response.json({ error: "Match must have 3–5 players." }, { status: 400 });
  }
  const placements = entries.map((e) => e.placement).sort((a, b) => a - b);
  const expected = Array.from({ length: n }, (_, i) => i + 1);
  if (placements.join(",") !== expected.join(",")) {
    return Response.json(
      { error: `Each placement (1–${n}) must be used exactly once.` },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: match, error: mErr } = await (supabase.from("matches") as any)
    .insert({ played_at: playedAt, notes: notes?.trim() || null })
    .select()
    .single();

  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  const rows: InsertRow[] = entries.map((e) => ({
    match_id: (match as { id: string }).id,
    player_id: e.playerId,
    placement: e.placement as InsertRow["placement"],
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rErr } = await (supabase.from("match_results") as any).insert(rows);
  if (rErr) return Response.json({ error: rErr.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/register");

  return Response.json({ ok: true, matchId: (match as { id: string }).id });
}
