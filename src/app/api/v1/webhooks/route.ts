import { NextResponse, type NextRequest } from "next/server";
import { inboundWebhookSchema } from "@/lib/validation/schemas/paymentLink";
import {
  recordWebhookPayment,
  PaymentLinkAmountError,
  PaymentLinkStateError,
  PaymentLinkNotFoundError,
} from "@/lib/services/paymentLinks";
import { writeAuditEvent } from "@/lib/audit/auditLog";
import { logger } from "@/lib/logger";

// Generic inbound gateway callback receiver — deliberately not
// vendor-specific (plan.md). A real integration adapts its provider's
// webhook shape to lib/validation/schemas/paymentLink.ts's inboundWebhookSchema
// before (or at) this endpoint. There is no NextAuth session here — the
// caller is an external gateway — so authentication is a shared secret
// header instead, matching the outbound-webhook signing approach used
// elsewhere in this API.
export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = inboundWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  try {
    const payment = await recordWebhookPayment(parsed.data);
    await writeAuditEvent({
      actorId: null,
      action: "payment_link.webhook_received",
      entityType: "PaymentLink",
      entityId: parsed.data.token,
      metadata: { gatewayTransactionId: parsed.data.gatewayTransactionId, status: parsed.data.status },
    });
    return NextResponse.json({ received: true, payment });
  } catch (err) {
    if (err instanceof PaymentLinkNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof PaymentLinkStateError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof PaymentLinkAmountError) return NextResponse.json({ error: err.message }, { status: 422 });
    logger.error({ err }, "unhandled error processing inbound webhook");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
