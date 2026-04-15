import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Player } from "@/lib/types";

export async function GET() {
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ players: (data ?? []) as Player[] });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "1") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  const { error } = await supabase.from("players").insert({ name: name.trim() });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/players");
  revalidatePath("/");
  return Response.json({ ok: true });
}
