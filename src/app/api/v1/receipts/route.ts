import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { listReceipts } from "@/lib/services/receipts";

// Read-only — receipts are never client-created (see lib/services/receipts.ts
// createReceiptForPayment): auto-generated as a side effect of recording a
// payment, so there is deliberately no POST here.
export const GET = withAuthedJson(
  null,
  async ({ request, session }) => {
    const paymentId = request.nextUrl.searchParams.get("paymentId") ?? undefined;
    const invoiceId = request.nextUrl.searchParams.get("invoiceId") ?? undefined;
    const receipts = await listReceipts(session.user.organizationId, { paymentId, invoiceId });
    return NextResponse.json(receipts);
  },
  { scope: "receipts:read" },
);
