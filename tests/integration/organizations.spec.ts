import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

// Signs up a brand-new organization through the real public /api/auth/signup
// endpoint, then logs in as its OWNER through the real NextAuth credentials
// flow (CSRF token + callback) — the exact same two-step flow a real
// browser session would go through, just driven via the API request context
// instead of a page. Returns a context carrying that session's cookies.
async function signupAndLogin(email: string, organizationName: string): Promise<APIRequestContext> {
  const anon = await playwrightRequest.newContext({ baseURL: "http://localhost:3000", storageState: { cookies: [], origins: [] } });

  const signupRes = await anon.post("/api/auth/signup", {
    data: {
      organizationName,
      name: "Test Owner",
      email,
      password: "password123",
      confirmPassword: "password123",
    },
  });
  expect(signupRes.ok()).toBe(true);

  const csrfRes = await anon.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const loginRes = await anon.post("/api/auth/callback/credentials", {
    form: { email, password: "password123", csrfToken, redirect: "false", json: "true" },
  });
  expect(loginRes.status()).toBe(200);

  return anon;
}

test.describe("Multi-tenant organizations", () => {
  let orgA: APIRequestContext;
  let orgB: APIRequestContext;
  let orgACustomerId: string;
  let orgAInvoiceId: string;
  let orgATemplateId: string;
  let orgAApiKeyId: string;
  let orgAWebhookEndpointId: string;

  test.beforeAll(async () => {
    const suffix = Date.now();
    orgA = await signupAndLogin(`${TEST_PREFIX.toLowerCase().replace(/ /g, "-")}-orga-${suffix}@example.com`, `${TEST_PREFIX} Org A`);
    orgB = await signupAndLogin(`${TEST_PREFIX.toLowerCase().replace(/ /g, "-")}-orgb-${suffix}@example.com`, `${TEST_PREFIX} Org B`);

    const customer = await (
      await orgA.post("/api/v1/customers", { data: { name: `${TEST_PREFIX} OrgA Customer`, state: "Haryana", stateCode: "06" } })
    ).json();
    orgACustomerId = customer.id;
    const template = await (
      await orgA.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} OrgA Template`, status: "ACTIVE" } })
    ).json();
    orgATemplateId = template.id;
    const invoice = await (
      await orgA.post("/api/v1/invoices", {
        data: { templateId: template.id, customerId: customer.id, items: [{ description: "X", quantity: "1", rate: "100", gstRate: "0" }] },
      })
    ).json();
    orgAInvoiceId = invoice.id;
    const apiKey = await (
      await orgA.post("/api/v1/api-keys", { data: { label: `${TEST_PREFIX} OrgA Key`, scopes: ["invoices:read"] } })
    ).json();
    orgAApiKeyId = apiKey.id;
    const endpoint = await (
      await orgA.post("/api/v1/webhook-endpoints", {
        data: { url: "http://127.0.0.1:1/nope", label: `${TEST_PREFIX} OrgA Webhook`, events: ["invoice.created"] },
      })
    ).json();
    orgAWebhookEndpointId = endpoint.id;
  });

  test.afterAll(async () => {
    await orgA.dispose();
    await orgB.dispose();
  });

  test("org B gets 404 — indistinguishable from not-existing — on every org A resource by id", async () => {
    expect((await orgB.get(`/api/v1/customers/${orgACustomerId}`)).status()).toBe(404);
    expect((await orgB.get(`/api/v1/templates/${orgATemplateId}`)).status()).toBe(404);
    expect((await orgB.get(`/api/v1/invoices/${orgAInvoiceId}`)).status()).toBe(404);
    expect((await orgB.get(`/api/v1/invoices/${orgAInvoiceId}/preview`)).status()).toBe(404);
    expect((await orgB.get(`/api/v1/invoices/${orgAInvoiceId}/pdf`)).status()).toBe(404);
    expect((await orgB.post(`/api/v1/api-keys/${orgAApiKeyId}/revoke`)).status()).toBe(404);
    expect((await orgB.get(`/api/v1/webhook-endpoints/${orgAWebhookEndpointId}`)).status()).toBe(404);
  });

  test("org B's own list endpoints never include org A's data", async () => {
    expect(await (await orgB.get("/api/v1/customers")).json()).toEqual([]);
    expect(await (await orgB.get("/api/v1/invoices")).json()).toEqual([]);
    // Every org auto-provisions its own default template at signup
    // (organizations.ts) — org B has exactly that one, and never org A's.
    const orgBTemplates = await (await orgB.get("/api/v1/templates")).json();
    expect(orgBTemplates.map((t: { id: string }) => t.id)).not.toContain(orgATemplateId);
    expect(orgBTemplates.every((t: { name: string }) => !t.name.startsWith(TEST_PREFIX))).toBe(true);
  });

  test("org A can still fully access its own resources", async () => {
    expect((await orgA.get(`/api/v1/invoices/${orgAInvoiceId}`)).ok()).toBe(true);
    expect((await orgA.get(`/api/v1/invoices/${orgAInvoiceId}/pdf`)).ok()).toBe(true);
  });

  test("each organization gets its own independent invoice-numbering sequence", async () => {
    const issueRes = await orgA.post(`/api/v1/invoices/${orgAInvoiceId}/issue`);
    expect(issueRes.ok()).toBe(true);
    const issued = await issueRes.json();
    // A fresh organization's first invoice always starts at 0001, regardless
    // of how many invoices any other organization (including the shared
    // dev-seed organization) has already issued — proves the
    // InvoiceNumberCounter is scoped per-organization, not global.
    expect(issued.invoiceNumber).toMatch(/-0001$/);
  });

  test("adding a team member is scoped to the creating organization and role-gated", async () => {
    const created = await orgA.post("/api/v1/users", {
      data: {
        name: `${TEST_PREFIX} Staffer`,
        email: `${TEST_PREFIX.toLowerCase().replace(/ /g, "-")}-staffer-${Date.now()}@example.com`,
        password: "password123",
        role: "STAFF",
      },
    });
    expect(created.ok()).toBe(true);

    const orgAUsers = await (await orgA.get("/api/v1/users")).json();
    expect(orgAUsers.length).toBe(2); // OWNER + the new STAFF

    const orgBUsers = await (await orgB.get("/api/v1/users")).json();
    expect(orgBUsers.length).toBe(1); // only org B's own OWNER — never sees org A's users
  });
});
