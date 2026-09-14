import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { auth } from "@/lib/auth/auth";
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
  // Restrict the route to specific roles (e.g. ["OWNER", "ADMIN"]). Omit to
  // allow any authenticated user.
  roles?: string[];
};

// Phase 1 scope: session-auth only. The dual session+API-key resolver
// (resolveRequestAuth) is introduced in Phase 14 once ApiKey issuance exists;
// this wrapper is the shared error-handling/Zod pattern every /api/v1 route
// will build on. TParams covers dynamic segments (e.g. { id: string } for
// /api/v1/customers/[id]); routes with no dynamic segments can ignore it.
export function withAuthedJson<TBody, TParams = Record<string, never>>(
  schema: ZodType<TBody> | null,
  handler: AuthedHandler<TBody, TParams>,
  options: WithAuthedJsonOptions = {},
) {
  return async (request: NextRequest, context?: { params: Promise<TParams> }) => {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new ApiError(401, "Unauthorized");
      }
      if (options.roles && !options.roles.includes(session.user.role)) {
        throw new ApiError(403, "Forbidden");
      }

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
