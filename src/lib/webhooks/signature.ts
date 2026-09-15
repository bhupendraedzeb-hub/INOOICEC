import crypto from "node:crypto";

// The default/fallback signing secret (.env.example, scaffolded in Phase 0)
// — used only if a WebhookEndpoint somehow has no signingSecret of its own;
// the create flow always generates one, so this is a defensive fallback,
// not the normal path.
function resolveSecret(endpointSecret: string | null): string {
  const secret = endpointSecret ?? process.env.WEBHOOK_DEFAULT_SIGNING_SECRET;
  if (!secret) throw new Error("No webhook signing secret available (endpoint has none and WEBHOOK_DEFAULT_SIGNING_SECRET is unset)");
  return secret;
}

// Signs `${timestamp}.${body}` rather than the body alone, so a captured
// signature can't be replayed against a different payload sent later — the
// receiver is expected to check the timestamp is recent in addition to
// verifying the signature (the same pattern Stripe/GitHub webhooks use).
export function signWebhookPayload(
  endpointSecret: string | null,
  body: string,
  timestamp: number = Date.now(),
): { signature: string; timestamp: number } {
  const secret = resolveSecret(endpointSecret);
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return { signature, timestamp };
}

export function verifyWebhookSignature(
  endpointSecret: string | null,
  body: string,
  timestamp: number,
  signature: string,
): boolean {
  const expected = signWebhookPayload(endpointSecret, body, timestamp).signature;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
