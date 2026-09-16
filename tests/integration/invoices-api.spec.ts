import { test, expect } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

test.describe("Invoice API", () => {
  let customerId: string;
  let templateId: string;

  test.beforeAll(async ({ request }) => {
    const customer = await request.post("/api/v1/customers", {
      data: { name: `${TEST_PREFIX} Invoices Co`, state: "Haryana", stateCode: "06" },
    });
    expect(customer.ok()).toBe(true);
    customerId = (await customer.json()).id;

    const template = await request.post("/api/v1/templates", {
      data: { name: `${TEST_PREFIX} Invoices Template`, status: "ACTIVE" },
    });
    expect(template.ok()).toBe(true);
    templateId = (await template.json()).id;
  });

  test("creating a draft always server-computes GST totals, ignoring any client-sent totals", async ({ request }) => {
    const res = await request.post("/api/v1/invoices", {
      data: {
        templateId,
        customerId,
        // A client attempting to smuggle its own totals through — the
        // server must recompute from items and ignore these entirely.
        grandTotal: "1",
        items: [{ description: "Widget", quantity: "1", rate: "1000", gstRate: "18" }],
      },
    });
    expect(res.status()).toBe(201);
    const invoice = await res.json();
    expect(invoice.status).toBe("DRAFT");
    expect(invoice.invoiceNumber).toBeNull();
    // Same-state (company + customer both stateCode 06) -> CGST+SGST split.
    expect(invoice.subtotal).toBe("1000");
    expect(invoice.cgstTotal).toBe("90");
    expect(invoice.sgstTotal).toBe("90");
    expect(invoice.igstTotal).toBe("0");
    expect(invoice.grandTotal).toBe("1180");
    expect(invoice.balanceDue).toBe("1180");
  });

  test("editing a draft recomputes totals; issuing assigns a number exactly once", async ({ request }) => {
    const created = await request.post("/api/v1/invoices", {
      data: { templateId, customerId, items: [{ description: "A", quantity: "1", rate: "500", gstRate: "18" }] },
    });
    const invoice = await created.json();
    expect(invoice.grandTotal).toBe("590");

    const updated = await request.put(`/api/v1/invoices/${invoice.id}`, {
      data: { templateId, customerId, items: [{ description: "B", quantity: "2", rate: "500", gstRate: "18" }] },
    });
    expect(updated.ok()).toBe(true);
    const updatedInvoice = await updated.json();
    expect(updatedInvoice.grandTotal).toBe("1180");
    expect(updatedInvoice.invoiceNumber).toBeNull(); // never assigned on edit

    const issued = await request.post(`/api/v1/invoices/${invoice.id}/issue`);
    expect(issued.ok()).toBe(true);
    const issuedInvoice = await issued.json();
    expect(issuedInvoice.status).toBe("ISSUED");
    expect(issuedInvoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);

    // Editing an issued invoice is rejected.
    const reEdit = await request.put(`/api/v1/invoices/${invoice.id}`, {
      data: { templateId, customerId, items: [{ description: "C", quantity: "1", rate: "1", gstRate: "0" }] },
    });
    expect(reEdit.status()).toBe(409);
  });

  test("cancel is a status flag, never a delete; duplicate creates a fresh unnumbered draft", async ({ request }) => {
    const created = await request.post("/api/v1/invoices", {
      data: { templateId, customerId, items: [{ description: "A", quantity: "1", rate: "100", gstRate: "18" }] },
    });
    const invoice = await created.json();
    await request.post(`/api/v1/invoices/${invoice.id}/issue`);

    const cancelled = await request.post(`/api/v1/invoices/${invoice.id}/cancel`, { data: { reason: "Test cancellation" } });
    expect(cancelled.ok()).toBe(true);
    expect((await cancelled.json()).status).toBe("CANCELLED");

    // Still readable — never hard-deleted.
    const stillThere = await request.get(`/api/v1/invoices/${invoice.id}`);
    expect(stillThere.ok()).toBe(true);

    const deleteAttempt = await request.delete(`/api/v1/invoices/${invoice.id}`);
    expect(deleteAttempt.status()).toBe(409);

    const duplicate = await request.post(`/api/v1/invoices/${invoice.id}/duplicate`);
    expect(duplicate.ok()).toBe(true);
    const dup = await duplicate.json();
    expect(dup.status).toBe("DRAFT");
    expect(dup.invoiceNumber).toBeNull();
    expect(dup.id).not.toBe(invoice.id);
  });

  test("a draft invoice can be hard-deleted; an issued one cannot", async ({ request }) => {
    const created = await request.post("/api/v1/invoices", {
      data: { templateId, customerId, items: [{ description: "A", quantity: "1", rate: "1", gstRate: "0" }] },
    });
    const invoice = await created.json();
    const deleted = await request.delete(`/api/v1/invoices/${invoice.id}`);
    expect(deleted.ok()).toBe(true);

    const gone = await request.get(`/api/v1/invoices/${invoice.id}`);
    expect(gone.status()).toBe(404);
  });
});
