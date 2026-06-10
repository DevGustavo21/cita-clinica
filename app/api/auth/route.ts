import { NextRequest, NextResponse } from "next/server";
import { DOCTOR_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** POST /api/auth — login del doctor { key } */
export async function POST(req: NextRequest) {
  const { key } = await req.json().catch(() => ({}));
  const expected = process.env.DOCTOR_ACCESS_KEY;
  if (!expected || key !== expected) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DOCTOR_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12, // 12 horas
    path: "/",
  });
  return res;
}

/** DELETE /api/auth — cerrar sesión */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DOCTOR_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
