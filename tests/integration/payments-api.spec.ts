import { test, expect } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

test.describe("Payment API", () => {
  let customerId: string;
  let templateId: string;

  test.beforeAll(async ({ request }) => {
    const customer = await request.post("/api/v1/customers", {
      data: { name: `${TEST_PREFIX} Payments Co`, state: "Haryana", stateCode: "06" },
    });
    customerId = (await customer.json()).id;
    const template = await request.post("/api/v1/templates", {
      data: { name: `${TEST_PREFIX} Payments Template`, status: "ACTIVE" },
    });
    templateId = (await template.json()).id;
  });

  async function issuedInvoice(request: import("@playwright/test").APIRequestContext, rate: string) {
    const created = await request.post("/api/v1/invoices", {
      data: { templateId, customerId, items: [{ description: "Item", quantity: "1", rate, gstRate: "18" }] },
    });
    const invoice = await created.json();
    const issued = await request.post(`/api/v1/invoices/${invoice.id}/issue`);
    return issued.json();
  }

  test("payments can only be recorded against issued invoices", async ({ request }) => {
    const draft = await request.post("/api/v1/invoices", {
      data: { templateId, customerId, items: [{ description: "A", quantity: "1", rate: "100", gstRate: "18" }] },
    });
    const invoice = await draft.json();
    const res = await request.post("/api/v1/payments", {
      data: { invoiceId: invoice.id, amount: "10", paymentDate: "2026-01-01", method: "CASH" },
    });
    expect(res.status()).toBe(409);
  });

  test("partial then full payment transitions UNPAID -> PARTIALLY_PAID -> PAID", async ({ request }) => {
    const invoice = await issuedInvoice(request, "1000"); // grandTotal 1180

    const partial = await request.post("/api/v1/payments", {
      data: { invoiceId: invoice.id, amount: "500", paymentDate: "2026-01-01", method: "BANK_TRANSFER" },
    });
    expect(partial.ok()).toBe(true);
    let refreshed = await (await request.get(`/api/v1/invoices/${invoice.id}`)).json();
    expect(refreshed.paymentStatus).toBe("PARTIALLY_PAID");
    expect(refreshed.balanceDue).toBe("680");

    const full = await request.post("/api/v1/payments", {
      data: { invoiceId: invoice.id, amount: "680", paymentDate: "2026-01-01", method: "BANK_TRANSFER" },
    });
    expect(full.ok()).toBe(true);
    refreshed = await (await request.get(`/api/v1/invoices/${invoice.id}`)).json();
    expect(refreshed.paymentStatus).toBe("PAID");
    expect(refreshed.balanceDue).toBe("0");
  });

  test("recording more than the balance due is rejected with 422", async ({ request }) => {
    const invoice = await issuedInvoice(request, "100"); // grandTotal 118
    const res = await request.post("/api/v1/payments", {
      data: { invoiceId: invoice.id, amount: "500", paymentDate: "2026-01-01", method: "CASH" },
    });
    expect(res.status()).toBe(422);
  });

  test("voiding a payment is never a delete and recomputes the invoice balance", async ({ request }) => {
    const invoice = await issuedInvoice(request, "100"); // grandTotal 118
    const payment = await (
      await request.post("/api/v1/payments", {
        data: { invoiceId: invoice.id, amount: "118", paymentDate: "2026-01-01", method: "CASH" },
      })
    ).json();

    let refreshed = await (await request.get(`/api/v1/invoices/${invoice.id}`)).json();
    expect(refreshed.paymentStatus).toBe("PAID");

    const voided = await request.post(`/api/v1/payments/${payment.id}/void`, { data: { reason: "Test void" } });
    expect(voided.ok()).toBe(true);

    refreshed = await (await request.get(`/api/v1/invoices/${invoice.id}`)).json();
    expect(refreshed.paymentStatus).toBe("UNPAID");
    expect(refreshed.balanceDue).toBe("118");

    // Still readable via the payments list — voided, not deleted.
    const list = await (await request.get(`/api/v1/payments?invoiceId=${invoice.id}`)).json();
    expect(list.find((p: { id: string }) => p.id === payment.id)?.isVoided).toBe(true);

    const reVoid = await request.post(`/api/v1/payments/${payment.id}/void`, { data: { reason: "Again" } });
    expect(reVoid.status()).toBe(409);
  });
});
