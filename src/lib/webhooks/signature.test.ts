import { describe, it, expect } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "./signature";

describe("signWebhookPayload / verifyWebhookSignature", () => {
  const secret = "test-signing-secret";
  const body = JSON.stringify({ event: "invoice.issued", data: { id: "inv_1" } });

  it("produces a verifiable signature for the exact secret/body/timestamp", () => {
    const { signature, timestamp } = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature(secret, body, timestamp, signature)).toBe(true);
  });

  it("rejects a signature checked against a different body", () => {
    const { signature, timestamp } = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature(secret, JSON.stringify({ event: "invoice.issued", data: { id: "inv_2" } }), timestamp, signature)).toBe(false);
  });

  it("rejects a signature checked against a different secret", () => {
    const { signature, timestamp } = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature("wrong-secret", body, timestamp, signature)).toBe(false);
  });

  it("rejects a signature checked against a different timestamp", () => {
    const { signature, timestamp } = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature(secret, body, timestamp + 1, signature)).toBe(false);
  });

  it("falls back to WEBHOOK_DEFAULT_SIGNING_SECRET when the endpoint has none", () => {
    const original = process.env.WEBHOOK_DEFAULT_SIGNING_SECRET;
    process.env.WEBHOOK_DEFAULT_SIGNING_SECRET = "fallback-secret";
    try {
      const { signature, timestamp } = signWebhookPayload(null, body);
      expect(verifyWebhookSignature(null, body, timestamp, signature)).toBe(true);
      expect(verifyWebhookSignature("fallback-secret", body, timestamp, signature)).toBe(true);
    } finally {
      process.env.WEBHOOK_DEFAULT_SIGNING_SECRET = original;
    }
  });

  it("throws when neither an endpoint secret nor the env fallback is available", () => {
    const original = process.env.WEBHOOK_DEFAULT_SIGNING_SECRET;
    delete process.env.WEBHOOK_DEFAULT_SIGNING_SECRET;
    try {
      expect(() => signWebhookPayload(null, body)).toThrow();
    } finally {
      process.env.WEBHOOK_DEFAULT_SIGNING_SECRET = original;
    }
  });
});
