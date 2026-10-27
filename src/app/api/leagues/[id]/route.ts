import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

async function checkAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session")?.value === "1";
}

async function checkMaster() {
  const cookieStore = await cookies();
  return cookieStore.get("master_session")?.value === "1";
}

export async function PUT(request: Request, ctx: RouteContext<"/api/leagues/[id]">) {
  if (!(await checkAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as { name?: string; is_closed?: boolean; winner_id?: string | null };

  let update: { name?: string; is_closed?: boolean; winner_id?: string | null };
  if (typeof body.is_closed === "boolean") {
    // Closing an official league requires a winner; reopening clears it
    const { data } = await supabase.from("leagues").select("is_practice").eq("id", id).single();
    const league = data as { is_practice: boolean } | null;
    if (!league) return Response.json({ error: "League not found." }, { status: 404 });
    if (body.is_closed && !league.is_practice && !body.winner_id) {
      return Response.json({ error: "Select a winner." }, { status: 400 });
    }
    update = { is_closed: body.is_closed, winner_id: body.is_closed ? body.winner_id ?? null : null };
  } else {
    if (!body.name?.trim()) {
      return Response.json({ error: "Name is required." }, { status: 400 });
    }
    update = { name: body.name.trim() };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("leagues") as any).update(update).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/leagues");
  revalidatePath(`/leagues/${id}`);
  revalidatePath("/register");
  revalidatePath("/");
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/leagues/[id]">) {
  if (!(await checkMaster())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const { data: matches } = await (supabase
    .from("matches")
    .select("id")
    .eq("league_id", id)
    .limit(1) as any);

  if (matches && matches.length > 0) {
    return Response.json(
      { error: "Cannot delete a league that has matches." },
      { status: 409 },
    );
  }

  const { error } = await (supabase.from("leagues") as any).delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/leagues");
  revalidatePath("/register");
  revalidatePath("/");
  return Response.json({ ok: true });
}
