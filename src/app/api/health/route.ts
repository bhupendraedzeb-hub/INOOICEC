import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Deliberately unauthenticated and outside /api/v1 — this is an
// infrastructure health check (Docker HEALTHCHECK, a reverse proxy's
// upstream check, an uptime monitor), not an application API endpoint, so
// it can't require a session or API key. Confirms both "the Next.js
// process is serving requests" and "the database is reachable" — the two
// failure modes that actually matter for this single-instance deployment.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
