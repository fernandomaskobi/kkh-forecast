import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { name } = (await request.json()) as { name: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, name: name.trim() });
  response.cookies.set("kkh_user", name.trim(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days
    httpOnly: false, // readable by client JS for nav display
    sameSite: "lax",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("kkh_user", "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
