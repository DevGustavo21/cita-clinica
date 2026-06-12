import type { NextRequest } from "next/server";

export const DOCTOR_COOKIE = "cvp_doctor";

/** ¿La petición tiene una sesión de doctor válida? */
export function isDoctor(req: NextRequest): boolean {
  const token = req.cookies.get(DOCTOR_COOKIE)?.value;
  return !!token && !!process.env.DOCTOR_ACCESS_KEY && token === process.env.DOCTOR_ACCESS_KEY;
}
