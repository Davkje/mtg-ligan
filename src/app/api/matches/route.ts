import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

type MatchEntry = { playerId: string; placement: 1 | 2 | 3 | 4 };

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "1") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playedAt, entries } = (await request.json()) as {
    playedAt: string;
    entries: MatchEntry[];
  };

  // Validate placements 1-4 each used exactly once
  const placements = entries.map((e) => e.placement).sort();
  if (
    entries.length !== 4 ||
    placements.join(",") !== "1,2,3,4"
  ) {
    return Response.json({ error: "Each placement (1–4) must be used exactly once." }, { status: 400 });
  }

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .insert({ played_at: playedAt })
    .select()
    .single();

  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  const { error: rErr } = await supabase.from("match_results").insert(
    entries.map((e) => ({
      match_id: match.id,
      player_id: e.playerId,
      placement: e.placement,
    }))
  );

  if (rErr) return Response.json({ error: rErr.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/register");

  return Response.json({ ok: true, matchId: match.id });
}
