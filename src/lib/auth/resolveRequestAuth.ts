import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { API_KEY_PREFIX, lookupPrefix, verifyApiKeySecret } from "@/lib/auth/apiKeyAuth";

export type ResolvedAuth =
  | { kind: "session"; session: Session }
  // API-key requests never carry a browser session, so `session` here is a
  // synthetic, session-shaped stand-in (the key's creator's id/name/email/
  // role) — this is what lets every existing route handler keep reading
  // `session.user.id` unchanged regardless of which auth path was used.
  | { kind: "apiKey"; session: Session; scopes: string[]; apiKeyId: string };

// The shared dual auth resolver every /api/v1 route funnels through (Phase
// 1's plan.md note: "the dual session+API-key resolver is introduced in
// Phase 14 once ApiKey issuance exists"). Session takes priority — a
// browser with a valid cookie is never asked to also present a Bearer
// token — falling back to `Authorization: Bearer inv_live_...` for external
// clients.
export async function resolveRequestAuth(request: NextRequest): Promise<ResolvedAuth | null> {
  const session = await auth();
  if (session?.user) return { kind: "session", session };

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token.startsWith(API_KEY_PREFIX)) return null;

  // argon2 salts each hash, so the stored hash can't be looked up directly
  // by value — `prefix` is the deterministic slice that narrows the query,
  // and argon2.verify is the actual credential check against each match
  // (almost always exactly one row).
  const candidates = await db.apiKey.findMany({
    where: { prefix: lookupPrefix(token), revokedAt: null },
    include: { createdBy: { select: { id: true, name: true, email: true, role: true } } },
  });

  for (const candidate of candidates) {
    if (await verifyApiKeySecret(candidate.hashedKey, token)) {
      // Fire-and-forget — a slow/failed timestamp write must never block or
      // fail the request it's attached to.
      db.apiKey.update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

      const actor = candidate.createdBy;
      const synthetic: Session = {
        // tokenVersion is a JWT-revocation field (see next-auth.d.ts's
        // User augmentation) that only matters for browser sessions — 0 is
        // an unused placeholder here, never read for an API-key actor.
        // organizationId is read from the key itself, not the creator, so a
        // key keeps working correctly even if its creator later leaves the
        // organization.
        user: {
          id: actor.id,
          name: actor.name,
          email: actor.email,
          role: actor.role,
          tokenVersion: 0,
          organizationId: candidate.organizationId,
          // Always true here — an API key's createdBy can't be looked up at
          // all if their row is gone, and deactivation doesn't revoke keys
          // they previously created (only explicit key revocation does).
          isActive: true,
        },
        expires: new Date(Date.now() + 60_000).toISOString(),
      };
      return { kind: "apiKey", session: synthetic, scopes: candidate.scopes, apiKeyId: candidate.id };
    }
  }
  return null;
}
