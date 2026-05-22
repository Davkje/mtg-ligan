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
  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  const { error } = await (supabase.from("leagues") as any).update({ name: name.trim() }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/leagues");
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
