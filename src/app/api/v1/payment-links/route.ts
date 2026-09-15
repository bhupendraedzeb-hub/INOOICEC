import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { createPaymentLinkSchema } from "@/lib/validation/schemas/paymentLink";
import { listPaymentLinks, createPaymentLink, PaymentLinkAmountError } from "@/lib/services/paymentLinks";
import { getInvoice } from "@/lib/services/invoices";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(
  null,
  async ({ request }) => {
    const invoiceId = request.nextUrl.searchParams.get("invoiceId") ?? undefined;
    const links = await listPaymentLinks({ invoiceId });
    return NextResponse.json(links);
  },
  { scope: "payment_links:read" },
);

export const POST = withAuthedJson(createPaymentLinkSchema, async ({ session, body }) => {
  const invoice = await getInvoice(body.invoiceId);
  if (!invoice) throw new ApiError(404, "Invoice not found");
  if (invoice.status !== "ISSUED") throw new ApiError(409, "Payment links can only be created for issued invoices");

  try {
    const link = await createPaymentLink(body, session.user.id);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "payment_link.created",
      entityType: "PaymentLink",
      entityId: link.id,
      metadata: { invoiceId: body.invoiceId, amount: body.amount, provider: body.provider },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    if (err instanceof PaymentLinkAmountError) throw new ApiError(422, err.message);
    throw err;
  }
}, { scope: "payment_links:write" });
