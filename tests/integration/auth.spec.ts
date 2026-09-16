import { test, expect, request as playwrightRequest } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

test.describe("Authentication", () => {
  test("an authenticated session can reach a protected route", async ({ request }) => {
    const res = await request.get("/api/v1/ping");
    expect(res.ok()).toBe(true);
    expect((await res.json()).ok).toBe(true);
  });

  test("no credentials at all is rejected with 401", async () => {
    // The bare storageState override is required — without it, newContext()
    // inherits the "chromium" project's configured storageState (the
    // logged-in OWNER session), defeating the entire point of "anon" here.
    const anon = await playwrightRequest.newContext({ baseURL: "http://localhost:3000", storageState: { cookies: [], origins: [] } });
    const res = await anon.get("/api/v1/invoices");
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  test("a garbage Bearer token is rejected with 401", async () => {
    // The bare storageState override is required — without it, newContext()
    // inherits the "chromium" project's configured storageState (the
    // logged-in OWNER session), defeating the entire point of "anon" here.
    const anon = await playwrightRequest.newContext({ baseURL: "http://localhost:3000", storageState: { cookies: [], origins: [] } });
    const res = await anon.get("/api/v1/invoices", {
      headers: { Authorization: "Bearer inv_live_not-a-real-key" },
    });
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  test.describe("API key scoping", () => {
    let plaintext: string;
    let keyId: string;

    test.beforeAll(async ({ request }) => {
      const res = await request.post("/api/v1/api-keys", {
        data: { label: `${TEST_PREFIX} Scoped Key`, scopes: ["invoices:read"] },
      });
      const key = await res.json();
      plaintext = key.plaintext;
      keyId = key.id;
      // The creation response must never leak the argon2 hash.
      expect(key.hashedKey).toBeUndefined();
    });

    test.afterAll(async ({ request }) => {
      await request.post(`/api/v1/api-keys/${keyId}/revoke`);
    });

    test("a key succeeds on a route matching its granted scope", async () => {
      // The bare storageState override is required — without it, newContext()
    // inherits the "chromium" project's configured storageState (the
    // logged-in OWNER session), defeating the entire point of "anon" here.
    const anon = await playwrightRequest.newContext({ baseURL: "http://localhost:3000", storageState: { cookies: [], origins: [] } });
      const res = await anon.get("/api/v1/invoices", { headers: { Authorization: `Bearer ${plaintext}` } });
      expect(res.ok()).toBe(true);
      await anon.dispose();
    });

    test("a key is rejected with 403 on a route requiring a scope it doesn't have", async () => {
      // The bare storageState override is required — without it, newContext()
    // inherits the "chromium" project's configured storageState (the
    // logged-in OWNER session), defeating the entire point of "anon" here.
    const anon = await playwrightRequest.newContext({ baseURL: "http://localhost:3000", storageState: { cookies: [], origins: [] } });
      const write = await anon.post("/api/v1/invoices", {
        headers: { Authorization: `Bearer ${plaintext}` },
        data: {},
      });
      expect(write.status()).toBe(403);

      const otherResource = await anon.get("/api/v1/customers", { headers: { Authorization: `Bearer ${plaintext}` } });
      expect(otherResource.status()).toBe(403);
      await anon.dispose();
    });

    test("a revoked key is rejected with 401, indistinguishable from not existing", async ({ request }) => {
      const revokeRes = await request.post(`/api/v1/api-keys/${keyId}/revoke`);
      expect(revokeRes.ok()).toBe(true);

      // The bare storageState override is required — without it, newContext()
    // inherits the "chromium" project's configured storageState (the
    // logged-in OWNER session), defeating the entire point of "anon" here.
    const anon = await playwrightRequest.newContext({ baseURL: "http://localhost:3000", storageState: { cookies: [], origins: [] } });
      const res = await anon.get("/api/v1/invoices", { headers: { Authorization: `Bearer ${plaintext}` } });
      expect(res.status()).toBe(401);
      await anon.dispose();
    });
  });
});
