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

type AuthedHandler<TBody> = (ctx: {
  request: NextRequest;
  session: Session;
  body: TBody;
}) => Promise<NextResponse>;

// Phase 1 scope: session-auth only. The dual session+API-key resolver
// (resolveRequestAuth) is introduced in Phase 14 once ApiKey issuance exists;
// this wrapper is the shared error-handling/Zod pattern every /api/v1 route
// will build on.
export function withAuthedJson<TBody>(schema: ZodType<TBody> | null, handler: AuthedHandler<TBody>) {
  return async (request: NextRequest) => {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new ApiError(401, "Unauthorized");
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

      return await handler({ request, session, body });
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
