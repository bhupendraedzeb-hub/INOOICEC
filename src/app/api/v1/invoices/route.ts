import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { invoiceInputSchema } from "@/lib/validation/schemas/invoice";
import { parseEnumParam } from "@/lib/validation/enumParam";
import { listInvoices, createInvoiceDraft } from "@/lib/services/invoices";
import { writeAuditEvent } from "@/lib/audit/auditLog";

const INVOICE_STATUSES = ["DRAFT", "ISSUED", "CANCELLED"] as const;
const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;

export const GET = withAuthedJson(
  null,
  async ({ request, session }) => {
    const params = request.nextUrl.searchParams;
    const invoices = await listInvoices(session.user.organizationId, {
      q: params.get("q") ?? undefined,
      status: parseEnumParam(params.get("status"), INVOICE_STATUSES),
      paymentStatus: parseEnumParam(params.get("paymentStatus"), PAYMENT_STATUSES),
      customerId: params.get("customerId") ?? undefined,
    });
    return NextResponse.json(invoices);
  },
  { scope: "invoices:read" },
);

export const POST = withAuthedJson(
  invoiceInputSchema,
  async ({ session, body }) => {
    const invoice = await createInvoiceDraft(body, session.user.id, session.user.organizationId);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "invoice.created",
      entityType: "Invoice",
      entityId: invoice.id,
    });
    return NextResponse.json(invoice, { status: 201 });
  },
  { scope: "invoices:write" },
);
