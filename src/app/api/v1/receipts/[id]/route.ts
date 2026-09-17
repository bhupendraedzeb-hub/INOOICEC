import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getReceipt } from "@/lib/services/receipts";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const receipt = await getReceipt(params.id, session.user.organizationId);
    if (!receipt) throw new ApiError(404, "Receipt not found");
    return NextResponse.json(receipt);
  },
  { scope: "receipts:read" },
);
