import { NextRequest, NextResponse } from "next/server";
import { DOCTOR_COOKIE } from "@/lib/auth";

/** Protege el dashboard del doctor (la API se protege en cada route) */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/doctor") && pathname !== "/doctor/login") {
    const expected = process.env.DOCTOR_ACCESS_KEY;
    const ok = !!expected && req.cookies.get(DOCTOR_COOKIE)?.value === expected;
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/doctor/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/doctor/:path*"] };
