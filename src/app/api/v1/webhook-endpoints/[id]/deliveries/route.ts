import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getWebhookEndpoint } from "@/lib/services/webhookEndpoints";
import { listWebhookDeliveries } from "@/lib/services/webhookDeliveries";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ params }) => {
    const endpoint = await getWebhookEndpoint(params.id);
    if (!endpoint) throw new ApiError(404, "Webhook endpoint not found");
    const deliveries = await listWebhookDeliveries({ endpointId: params.id });
    return NextResponse.json(deliveries);
  },
  { roles: ["OWNER", "ADMIN"] },
);
