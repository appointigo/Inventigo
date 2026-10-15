import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = [
  "/login",
  "/api/auth",
  "/api/cron",
  "/api/demo-requests",
  "/api/whatsapp/webhook",
  "/verify-email",
  "/onboarding",
  "/invite",
  "/stockiva-admin",
  "/api/admin/bootstrap-status",
  "/api/admin/create-super-admin",
];

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Root landing page is public
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Allow public routes (prefix match)
  if (pathname === "/api/public/subscription-plans" || pathname === "/api/webhooks/razorpay" || publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Auth.js can split a large session token across numbered cookies.
  // This is only a fast presence check; route handlers validate the session.
  const hasSessionCookie = request.cookies.getAll().some(({ name, value }) =>
    Boolean(value) && /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/.test(name)
  );

  if (!hasSessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
