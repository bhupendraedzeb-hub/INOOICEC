import crypto from "node:crypto";
import { db } from "@/lib/db";
import type { CreateWebhookEndpointInput, UpdateWebhookEndpointInput } from "@/lib/validation/schemas/webhookEndpoint";

function generateSigningSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function listWebhookEndpoints(organizationId: string) {
  return db.webhookEndpoint.findMany({
    where: { organizationId },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWebhookEndpoint(id: string, organizationId: string) {
  return db.webhookEndpoint.findFirst({ where: { id, organizationId } });
}

// Unlike ApiKey's hashed secret, the signing secret is stored in plaintext
// and stays visible after creation (list/get both return it) — the server
// has to actively use it to sign every delivery, and the endpoint's owner
// needs to reference it when configuring/debugging signature verification
// on the receiving side. Session-only, OWNER/ADMIN-gated at the route
// layer, same as ApiKey management.
export async function createWebhookEndpoint(input: CreateWebhookEndpointInput, actorId: string, organizationId: string) {
  return db.webhookEndpoint.create({
    data: {
      organizationId,
      url: input.url,
      label: input.label || null,
      events: input.events,
      signingSecret: generateSigningSecret(),
      createdById: actorId,
    },
  });
}

export async function updateWebhookEndpoint(id: string, organizationId: string, input: UpdateWebhookEndpointInput) {
  await db.webhookEndpoint.findFirstOrThrow({ where: { id, organizationId } });
  return db.webhookEndpoint.update({
    where: { id },
    data: { url: input.url, label: input.label || null, events: input.events, isActive: input.isActive },
  });
}
