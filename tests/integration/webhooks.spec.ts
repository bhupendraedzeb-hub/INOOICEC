import http from "node:http";
import crypto from "node:crypto";
import { test, expect } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

type ReceivedCall = { headers: http.IncomingHttpHeaders; body: string };

async function startReceiver(): Promise<{ url: string; calls: ReceivedCall[]; close: () => Promise<void> }> {
  const calls: ReceivedCall[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      calls.push({ headers: req.headers, body });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}/webhook`,
    calls,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

async function waitFor(check: () => Promise<boolean>, timeoutMs = 35_000, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

test.describe("Webhooks", () => {
  test("an invoice.created event is delivered, HMAC-signed, and verifiable", async ({ request }) => {
    test.setTimeout(90_000);
    const receiver = await startReceiver();
    try {
      const endpointRes = await request.post("/api/v1/webhook-endpoints", {
        data: { url: receiver.url, label: `${TEST_PREFIX} Webhook Endpoint`, events: ["invoice.created"] },
      });
      expect(endpointRes.ok()).toBe(true);
      const endpoint = await endpointRes.json();
      expect(typeof endpoint.signingSecret).toBe("string");

      const customer = await (
        await request.post("/api/v1/customers", { data: { name: `${TEST_PREFIX} Webhook Co`, state: "Haryana", stateCode: "06" } })
      ).json();
      const template = await (
        await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} Webhook Template`, status: "ACTIVE" } })
      ).json();
      const invoice = await (
        await request.post("/api/v1/invoices", {
          data: { templateId: template.id, customerId: customer.id, items: [{ description: "X", quantity: "1", rate: "10", gstRate: "0" }] },
        })
      ).json();

      const delivered = await waitFor(async () => receiver.calls.length > 0);
      expect(delivered).toBe(true);

      const call = receiver.calls[0];
      const payload = JSON.parse(call.body);
      expect(payload.event).toBe("invoice.created");
      expect(payload.data.entityId).toBe(invoice.id);

      // Independently recompute the signature — proves the worker actually
      // signs with this endpoint's own secret, not just that a header is
      // present.
      const timestamp = call.headers["x-webhook-timestamp"] as string;
      const expected = crypto.createHmac("sha256", endpoint.signingSecret).update(`${timestamp}.${call.body}`).digest("hex");
      expect(call.headers["x-webhook-signature"]).toBe(`sha256=${expected}`);

      const deliveries = await (await request.get(`/api/v1/webhook-endpoints/${endpoint.id}/deliveries`)).json();
      expect(deliveries[0].status).toBe("SUCCESS");
    } finally {
      await receiver.close();
    }
  });

  test("delivering to an unreachable endpoint fails cleanly and can be replayed", async ({ request }) => {
    test.setTimeout(90_000);
    const endpointRes = await request.post("/api/v1/webhook-endpoints", {
      data: { url: "http://127.0.0.1:1/nope", label: `${TEST_PREFIX} Unreachable Endpoint`, events: ["invoice.created"] },
    });
    const endpoint = await endpointRes.json();

    const customer = await (
      await request.post("/api/v1/customers", { data: { name: `${TEST_PREFIX} Unreachable Co`, state: "Haryana", stateCode: "06" } })
    ).json();
    const template = await (
      await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} Unreachable Template`, status: "ACTIVE" } })
    ).json();
    await request.post("/api/v1/invoices", {
      data: { templateId: template.id, customerId: customer.id, items: [{ description: "X", quantity: "1", rate: "10", gstRate: "0" }] },
    });

    const failed = await waitFor(async () => {
      const deliveries = await (await request.get(`/api/v1/webhook-endpoints/${endpoint.id}/deliveries`)).json();
      return deliveries.length > 0 && deliveries[0].status === "FAILED";
    });
    expect(failed).toBe(true);

    const deliveries = await (await request.get(`/api/v1/webhook-endpoints/${endpoint.id}/deliveries`)).json();
    const delivery = deliveries[0];
    expect(delivery.attempts).toBeGreaterThanOrEqual(1);
    expect(delivery.nextAttemptAt).not.toBeNull();

    const replay = await request.post(`/api/v1/webhook-deliveries/${delivery.id}/replay`);
    expect(replay.ok()).toBe(true);
    const replayed = await replay.json();
    expect(replayed.status).toBe("PENDING");
    expect(replayed.attempts).toBe(0);
  });
});
