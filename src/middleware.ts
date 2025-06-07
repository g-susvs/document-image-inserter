// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("auth");
  const { pathname } = request.nextUrl;

  const isLoggedIn = authCookie?.value === "true";

  if(pathname === "/"){
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Protege el dashboard (redirige a login si no está logueado)
  if (!isLoggedIn && pathname.startsWith("/home")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Si ya está logueado y va a /login o / => redirigir a /dashboard
  if (isLoggedIn && (pathname === "/auth/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/login", "/dashboard"],
};
