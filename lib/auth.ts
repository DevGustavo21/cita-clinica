import type { NextRequest } from "next/server";

export const DOCTOR_COOKIE = "cvp_doctor";

/** Sesión simple por cookie httpOnly comparada contra DOCTOR_ACCESS_KEY */
export function isDoctor(req: NextRequest): boolean {
  const key = process.env.DOCTOR_ACCESS_KEY;
  if (!key) return false;
  return req.cookies.get(DOCTOR_COOKIE)?.value === key;
}
