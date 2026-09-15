import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getPaymentLink, deactivatePaymentLink, PaymentLinkStateError } from "@/lib/services/paymentLinks";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const POST = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const existing = await getPaymentLink(params.id);
    if (!existing) throw new ApiError(404, "Payment link not found");

    try {
      const link = await deactivatePaymentLink(params.id);
      await writeAuditEvent({
        actorId: session.user.id,
        action: "payment_link.deactivated",
        entityType: "PaymentLink",
        entityId: link.id,
      });
      return NextResponse.json(link);
    } catch (err) {
      if (err instanceof PaymentLinkStateError) throw new ApiError(409, err.message);
      throw err;
    }
  },
  { scope: "payment_links:write" },
);
