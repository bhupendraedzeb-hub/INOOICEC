import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { voidPaymentSchema, type VoidPaymentInput } from "@/lib/validation/schemas/payment";
import { getPayment, voidPayment } from "@/lib/services/payments";
import { writeAuditEvent } from "@/lib/audit/auditLog";

// Voided, never deleted — see plan.md's financial-record rule.
export const POST = withAuthedJson<VoidPaymentInput, { id: string }>(
  voidPaymentSchema,
  async ({ session, body, params }) => {
    const existing = await getPayment(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Payment not found");
    if (existing.isVoided) throw new ApiError(409, "Payment is already voided");

    const payment = await voidPayment(params.id, session.user.organizationId, body.reason);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "payment.voided",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { reason: body.reason },
    });
    return NextResponse.json(payment);
  },
  { scope: "payments:write" },
);
