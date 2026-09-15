import { z } from "zod";
import { decimalString } from "@/lib/validation/decimal";

export const createPaymentLinkSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: decimalString,
  provider: z.string().min(1, "Provider is required"),
  expiresAt: z.string().nullish(),
});
export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;

// Generic inbound gateway callback payload — deliberately vendor-agnostic
// (plan.md: no hardcoded per-gateway integration paths). A real gateway
// integration maps its own webhook shape into this before calling
// recordWebhookPayment, or the gateway is configured to call this endpoint
// directly with fields under these names.
export const inboundWebhookSchema = z.object({
  token: z.string().min(1, "token is required"),
  gatewayTransactionId: z.string().min(1, "gatewayTransactionId is required"),
  amount: decimalString,
  status: z.enum(["success", "failed"]),
});
export type InboundWebhookInput = z.infer<typeof inboundWebhookSchema>;
