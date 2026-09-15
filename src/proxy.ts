import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// Next.js 16: this file replaces the deprecated middleware.ts convention.
// Runs on the Node.js runtime by default, so the in-memory rate-limit map in
// lib/rateLimit.ts persists across requests within this process.
//
// Two separate buckets: /api/auth/* stays tight (login brute-forcing is the
// highest-value target and legitimate traffic there is rare). /api/v1/* gets
// a much looser limit — its own threat model is API-key brute-forcing
// (guessing a Bearer secret), not normal usage, and legitimate programmatic
// clients can call it far more often than a human logs in.
export function proxy(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const isAuthRoute = request.nextUrl.pathname.startsWith("/api/auth/");
  const { allowed, resetAt } = isAuthRoute
    ? rateLimit(`auth:${ip}`, 20, 60_000)
    : rateLimit(`api:${ip}`, 300, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*", "/api/v1/:path*"],
};
