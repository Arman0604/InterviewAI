import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (/\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const publicPaths = ["/", "/login", "/register", "/api/auth/login", "/api/auth/register"];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }

  // Route guards
  if (pathname.startsWith("/hiring")) {
    return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
