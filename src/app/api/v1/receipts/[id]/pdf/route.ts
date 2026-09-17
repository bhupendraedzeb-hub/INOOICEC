import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getReceipt } from "@/lib/services/receipts";
import { renderReceiptPdf } from "@/lib/pdf/printReceipt";

// Mirrors src/app/api/v1/invoices/[id]/pdf/route.ts exactly.
export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const receipt = await getReceipt(params.id, session.user.organizationId);
    if (!receipt) throw new ApiError(404, "Receipt not found");

    const pdf = await renderReceiptPdf(params.id);
    const filename = `${receipt.receiptNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { scope: "receipts:read" },
);
