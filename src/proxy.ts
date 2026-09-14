import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// Next.js 16: this file replaces the deprecated middleware.ts convention.
// Runs on the Node.js runtime by default, so the in-memory rate-limit map in
// lib/rateLimit.ts persists across requests within this process.
export function proxy(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed, resetAt } = rateLimit(`auth:${ip}`, 20, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
