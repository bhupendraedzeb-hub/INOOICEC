import { db } from "@/lib/db";
import { TEST_PREFIX } from "./constants";

export async function cleanupTestData() {
  const invoices = await db.invoice.findMany({
    where: { customer: { name: { startsWith: TEST_PREFIX } } },
    select: { id: true },
  });
  const invoiceIds = invoices.map((i) => i.id);
  if (invoiceIds.length > 0) {
    await db.paymentLink.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await db.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await db.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await db.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  }

  await db.customer.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });

  const templates = await db.template.findMany({
    where: { name: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const templateIds = templates.map((t) => t.id);
  if (templateIds.length > 0) {
    await db.templateVersion.deleteMany({ where: { templateId: { in: templateIds } } });
    await db.template.deleteMany({ where: { id: { in: templateIds } } });
  }

  const endpoints = await db.webhookEndpoint.findMany({
    where: { label: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const endpointIds = endpoints.map((e) => e.id);
  if (endpointIds.length > 0) {
    await db.webhookDelivery.deleteMany({ where: { endpointId: { in: endpointIds } } });
    await db.webhookEndpoint.deleteMany({ where: { id: { in: endpointIds } } });
  }

  const apiKeys = await db.apiKey.findMany({ where: { label: { startsWith: TEST_PREFIX } }, select: { id: true } });
  if (apiKeys.length > 0) {
    await db.apiKey.deleteMany({ where: { id: { in: apiKeys.map((k) => k.id) } } });
  }
}
