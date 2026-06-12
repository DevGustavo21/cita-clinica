import { NextRequest, NextResponse } from "next/server";
import { DOCTOR_COOKIE } from "@/lib/auth";

/** Protege el panel del doctor: redirige a /doctor/login si no hay sesión. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/doctor") && pathname !== "/doctor/login") {
    const token = req.cookies.get(DOCTOR_COOKIE)?.value;
    if (!token || token !== process.env.DOCTOR_ACCESS_KEY) {
      const url = req.nextUrl.clone();
      url.pathname = "/doctor/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/doctor/:path*"] };
