import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getPaymentLink } from "@/lib/services/paymentLinks";

export const GET = withAuthedJson<undefined, { id: string }>(null, async ({ params }) => {
  const link = await getPaymentLink(params.id);
  if (!link) throw new ApiError(404, "Payment link not found");
  return NextResponse.json(link);
});
