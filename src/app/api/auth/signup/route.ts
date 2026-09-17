import { NextResponse, type NextRequest } from "next/server";
import { signupSchema } from "@/lib/validation/schemas/auth";
import { signupOrganization, EmailAlreadyRegisteredError } from "@/lib/services/organizations";
import { writeAuditEvent } from "@/lib/audit/auditLog";
import { logger } from "@/lib/logger";

// Public self-registration — no session/API-key auth (there's no account
// yet). Lives under /api/auth/ (not /api/v1/) so it inherits proxy.ts's
// existing tight per-IP rate-limit bucket for auth routes, same as
// /api/auth/[...nextauth]. Creates a brand-new, fully isolated Organization
// and its OWNER user; never joins an existing organization.
export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => ({}));
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  try {
    const { organization, user } = await signupOrganization(parsed.data);
    await writeAuditEvent({
      organizationId: organization.id,
      actorId: user.id,
      action: "organization.signed_up",
      entityType: "Organization",
      entityId: organization.id,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    logger.error({ err }, "unhandled error during signup");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
