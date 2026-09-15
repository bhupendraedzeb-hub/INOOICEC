import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { invoiceInputSchema } from "@/lib/validation/schemas/invoice";
import { listInvoices, createInvoiceDraft } from "@/lib/services/invoices";
import { writeAuditEvent } from "@/lib/audit/auditLog";
import type { InvoiceStatus, PaymentStatus } from "@/generated/prisma/client";

export const GET = withAuthedJson(null, async ({ request }) => {
  const params = request.nextUrl.searchParams;
  const invoices = await listInvoices({
    q: params.get("q") ?? undefined,
    status: (params.get("status") as InvoiceStatus) ?? undefined,
    paymentStatus: (params.get("paymentStatus") as PaymentStatus) ?? undefined,
    customerId: params.get("customerId") ?? undefined,
  });
  return NextResponse.json(invoices);
});

export const POST = withAuthedJson(invoiceInputSchema, async ({ session, body }) => {
  const invoice = await createInvoiceDraft(body, session.user.id);
  await writeAuditEvent({
    actorId: session.user.id,
    action: "invoice.created",
    entityType: "Invoice",
    entityId: invoice.id,
  });
  return NextResponse.json(invoice, { status: 201 });
});
