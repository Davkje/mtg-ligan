import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { League } from "@/lib/types";

export async function GET() {
  const { data, error } = await supabase.from("leagues").select("*").order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ leagues: (data ?? []) as League[] });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")?.value !== "1") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, is_practice } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  const { error } = await (supabase.from("leagues") as any).insert({
    name: name.trim(),
    is_practice: is_practice ?? false,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/register");
  return Response.json({ ok: true });
}
