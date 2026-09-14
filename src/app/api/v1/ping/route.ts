import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";

// Example route establishing the Phase 1 pattern every /api/v1 route follows:
// auth check + Zod validation + centralized error handling, via withAuthedJson.
export const GET = withAuthedJson(null, async ({ session }) => {
  return NextResponse.json({ ok: true, user: { id: session.user.id, role: session.user.role } });
});
