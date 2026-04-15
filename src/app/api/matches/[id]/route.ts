import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/types";

type InsertRow = Database["public"]["Tables"]["match_results"]["Insert"];
type Entry = { playerId: string; placement: number };

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
  const { playedAt, entries, notes } = (await request.json()) as {
    playedAt: string;
    entries: Entry[];
    notes?: string;
  };

  const n = entries.length;
  if (n < 3 || n > 5) {
    return Response.json({ error: "Match must have 3–5 players." }, { status: 400 });
  }
  const sorted = entries.map((e) => e.placement).sort((a, b) => a - b);
  const expected = Array.from({ length: n }, (_, i) => i + 1);
  if (sorted.join(",") !== expected.join(",")) {
    return Response.json(
      { error: `Each placement (1–${n}) must be used exactly once.` },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: mErr } = await (supabase.from("matches") as any)
    .update({ played_at: playedAt, notes: notes?.trim() || null })
    .eq("id", id);
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  await supabase.from("match_results").delete().eq("match_id", id);

  const rows: InsertRow[] = entries.map((e) => ({
    match_id: id,
    player_id: e.playerId,
    placement: e.placement as InsertRow["placement"],
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rErr } = await (supabase.from("match_results") as any).insert(rows);
  if (rErr) return Response.json({ error: rErr.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath(`/match/${id}`);
  return Response.json({ ok: true });
}
