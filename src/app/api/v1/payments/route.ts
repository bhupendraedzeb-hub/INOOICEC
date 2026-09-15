import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { createPaymentSchema } from "@/lib/validation/schemas/payment";
import { listPayments, createPayment, OverpaymentError } from "@/lib/services/payments";
import { getInvoice } from "@/lib/services/invoices";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(
  null,
  async ({ request }) => {
    const invoiceId = request.nextUrl.searchParams.get("invoiceId") ?? undefined;
    const payments = await listPayments({ invoiceId });
    return NextResponse.json(payments);
  },
  { scope: "payments:read" },
);

export const POST = withAuthedJson(
  createPaymentSchema,
  async ({ session, body }) => {
    const invoice = await getInvoice(body.invoiceId);
    if (!invoice) throw new ApiError(404, "Invoice not found");
    if (invoice.status !== "ISSUED") throw new ApiError(409, "Payments can only be recorded against issued invoices");

    try {
      const payment = await createPayment(body, session.user.id);
      await writeAuditEvent({
        actorId: session.user.id,
        action: "payment.created",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { invoiceId: body.invoiceId, amount: body.amount },
      });
      return NextResponse.json(payment, { status: 201 });
    } catch (err) {
      if (err instanceof OverpaymentError) throw new ApiError(422, err.message);
      throw err;
    }
  },
  { scope: "payments:write" },
);
