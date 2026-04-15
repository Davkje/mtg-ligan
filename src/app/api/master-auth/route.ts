import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (!password || password !== process.env.MASTER_PASSWORD) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("master_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return Response.json({ ok: true });
}
