import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/types";

type InsertRow = Database["public"]["Tables"]["match_results"]["Insert"];
type Entry = { playerId: string; placement: number; commanderId?: string | null };

async function checkAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session")?.value === "1";
}

async function checkMaster() {
  const cookieStore = await cookies();
  return cookieStore.get("master_session")?.value === "1";
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/matches/[id]">
) {
  if (!(await checkMaster())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/history");
  return Response.json({ ok: true });
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/matches/[id]">
) {
  if (!(await checkAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { playedAt, entries, notes, leagueId } = (await request.json()) as {
    playedAt: string;
    entries: Entry[];
    notes?: string;
    leagueId?: string;
  };

  const n = entries.length;
  if (n < 3 || n > 5) {
    return Response.json({ error: "Match must have 3–5 players." }, { status: 400 });
  }
  const placements = entries.map((e) => e.placement);
  if (placements.some((p) => p < 1 || p > n)) {
    return Response.json({ error: `Placements must be between 1 and ${n}.` }, { status: 400 });
  }
  if (!placements.includes(1)) {
    return Response.json({ error: "At least one player must be in 1st place." }, { status: 400 });
  }
  if (new Set(entries.map((e) => e.playerId)).size !== n) {
    return Response.json({ error: "Each player can only appear once." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: mErr } = await (supabase.from("matches") as any)
    .update({ played_at: playedAt, notes: notes?.trim() || null, ...(leagueId && { league_id: leagueId }) })
    .eq("id", id);
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  await supabase.from("match_results").delete().eq("match_id", id);

  const rows: InsertRow[] = entries.map((e) => ({
    match_id: id,
    player_id: e.playerId,
    placement: e.placement as InsertRow["placement"],
    commander_id: e.commanderId || null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rErr } = await (supabase.from("match_results") as any).insert(rows);
  if (rErr) return Response.json({ error: rErr.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath(`/match/${id}`);
  return Response.json({ ok: true });
}
