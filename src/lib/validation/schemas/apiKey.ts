import { z } from "zod";

// One read/write pair per resource an external client can act on through
// /api/v1. Session (browser) requests are governed by User.role as before;
// this scope list only gates API-key requests (see
// lib/auth/resolveRequestAuth.ts) — a session actor's role check and an
// API-key actor's scope check are two different gates on the same
// withAuthedJson `options`, never both applied to the same request.
export const API_KEY_SCOPES = [
  "customers:read",
  "customers:write",
  "products:read",
  "products:write",
  "templates:read",
  "templates:write",
  "invoices:read",
  "invoices:write",
  "payments:read",
  "payments:write",
  "payment_links:read",
  "payment_links:write",
  "settings:read",
  "settings:write",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const createApiKeySchema = z.object({
  label: z.string().min(1, "Label is required"),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1, "Select at least one scope"),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
