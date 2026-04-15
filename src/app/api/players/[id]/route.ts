import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { RouteContext } from "next/dist/server/future/route-modules/app-route/module.compiled";

function checkAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore.get("admin_session")?.value === "1";
}

function checkMaster(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore.get("master_session")?.value === "1";
}

export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/players/[id]">
) {
  const cookieStore = await cookies();
  if (!checkAdmin(cookieStore)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  const { error } = await (supabase.from("players") as any).update({ name: name.trim() }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/players");
  revalidatePath(`/player/${id}`);
  revalidatePath("/");
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/players/[id]">
) {
  const cookieStore = await cookies();
  if (!checkMaster(cookieStore)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Block delete if player has match history
  const { data: results } = await (supabase
    .from("match_results")
    .select("id")
    .eq("player_id", id)
    .limit(1) as any);

  if (results && results.length > 0) {
    return Response.json(
      { error: "Cannot delete a player with match history." },
      { status: 409 }
    );
  }

  const { error } = await (supabase.from("players") as any).delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/players");
  revalidatePath("/");
  return Response.json({ ok: true });
}
