import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { resolveRequestAuth } from "@/lib/auth/resolveRequestAuth";
import { logger } from "@/lib/logger";
import type { Session } from "next-auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type AuthedHandler<TBody, TParams> = (ctx: {
  request: NextRequest;
  session: Session;
  body: TBody;
  params: TParams;
}) => Promise<NextResponse>;

type WithAuthedJsonOptions = {
  // Restrict the route to specific roles (e.g. ["OWNER", "ADMIN"]) — checked
  // only for a session (browser) actor.
  roles?: string[];
  // Restrict the route to a required scope (e.g. "invoices:write") — checked
  // only for an API-key actor. A session actor is never scope-gated (its
  // `roles` check above is the only gate that applies to it) and an
  // API-key actor is never role-gated — one request is governed by exactly
  // one of the two permission models, never both.
  scope?: string;
};

// The shared error-handling/Zod/dual-auth pattern every /api/v1 route
// builds on (lib/auth/resolveRequestAuth.ts: NextAuth session first, else
// `Authorization: Bearer inv_live_...`). TParams covers dynamic segments
// (e.g. { id: string } for /api/v1/customers/[id]); routes with no dynamic
// segments can ignore it.
export function withAuthedJson<TBody, TParams = Record<string, never>>(
  schema: ZodType<TBody> | null,
  handler: AuthedHandler<TBody, TParams>,
  options: WithAuthedJsonOptions = {},
) {
  return async (request: NextRequest, context?: { params: Promise<TParams> }) => {
    try {
      const resolved = await resolveRequestAuth(request);
      if (!resolved) {
        throw new ApiError(401, "Unauthorized");
      }
      if (resolved.kind === "session" && options.roles && !options.roles.includes(resolved.session.user.role)) {
        throw new ApiError(403, "Forbidden");
      }
      if (resolved.kind === "apiKey" && options.scope && !resolved.scopes.includes(options.scope)) {
        throw new ApiError(403, `Forbidden — API key is missing required scope: ${options.scope}`);
      }
      const session = resolved.session;

      let body = undefined as TBody;
      if (schema) {
        const raw = request.method === "GET" ? {} : await request.json().catch(() => ({}));
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.issues },
            { status: 422 },
          );
        }
        body = parsed.data;
      }

      const params = context ? await context.params : ({} as TParams);
      return await handler({ request, session, body, params });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Validation failed", issues: err.issues }, { status: 422 });
      }
      logger.error({ err, path: request.nextUrl.pathname }, "unhandled API error");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
