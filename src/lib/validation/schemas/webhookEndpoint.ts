import { z } from "zod";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";

export const createWebhookEndpointSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  label: z.string().nullish(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Select at least one event"),
});
export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;

export const updateWebhookEndpointSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  label: z.string().nullish(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Select at least one event"),
  isActive: z.boolean(),
});
export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;
