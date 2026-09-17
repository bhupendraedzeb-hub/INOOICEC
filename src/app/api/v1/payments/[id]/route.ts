import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { updatePaymentSchema, type UpdatePaymentInput } from "@/lib/validation/schemas/payment";
import { getPayment, updatePayment, OverpaymentError } from "@/lib/services/payments";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const payment = await getPayment(params.id, session.user.organizationId);
    if (!payment) throw new ApiError(404, "Payment not found");
    return NextResponse.json(payment);
  },
  { scope: "payments:read" },
);

export const PUT = withAuthedJson<UpdatePaymentInput, { id: string }>(
  updatePaymentSchema,
  async ({ session, body, params }) => {
    const existing = await getPayment(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Payment not found");
    if (existing.isVoided) throw new ApiError(409, "Cannot edit a voided payment");

    try {
      const payment = await updatePayment(params.id, session.user.organizationId, body);
      await writeAuditEvent({
        organizationId: session.user.organizationId,
        actorId: session.user.id,
        action: "payment.updated",
        entityType: "Payment",
        entityId: payment.id,
      });
      return NextResponse.json(payment);
    } catch (err) {
      if (err instanceof OverpaymentError) throw new ApiError(422, err.message);
      throw err;
    }
  },
  { scope: "payments:write" },
);
