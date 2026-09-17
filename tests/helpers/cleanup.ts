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

  // Test organizations created via the real /api/auth/signup flow
  // (tests/integration/organizations.spec.ts) — a self-contained tenant
  // each, so cascade-delete everything under them, not just name-prefixed
  // rows within the shared default organization the rest of this file
  // cleans up.
  const testOrgs = await db.organization.findMany({
    where: { name: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  for (const { id: organizationId } of testOrgs) {
    const orgInvoices = await db.invoice.findMany({ where: { organizationId }, select: { id: true } });
    const orgInvoiceIds = orgInvoices.map((i) => i.id);
    if (orgInvoiceIds.length > 0) {
      await db.paymentLink.deleteMany({ where: { invoiceId: { in: orgInvoiceIds } } });
      await db.payment.deleteMany({ where: { invoiceId: { in: orgInvoiceIds } } });
      await db.invoiceItem.deleteMany({ where: { invoiceId: { in: orgInvoiceIds } } });
      await db.invoice.deleteMany({ where: { id: { in: orgInvoiceIds } } });
    }
    await db.webhookDelivery.deleteMany({ where: { endpoint: { organizationId } } });
    await db.webhookEndpoint.deleteMany({ where: { organizationId } });
    await db.apiKey.deleteMany({ where: { organizationId } });
    await db.customer.deleteMany({ where: { organizationId } });
    const orgTemplates = await db.template.findMany({ where: { organizationId }, select: { id: true } });
    const orgTemplateIds = orgTemplates.map((t) => t.id);
    if (orgTemplateIds.length > 0) {
      await db.templateVersion.deleteMany({ where: { templateId: { in: orgTemplateIds } } });
      await db.template.deleteMany({ where: { id: { in: orgTemplateIds } } });
    }
    await db.invoiceNumberCounter.deleteMany({ where: { organizationId } });
    await db.auditLog.deleteMany({ where: { organizationId } });
    await db.user.deleteMany({ where: { organizationId } });
    await db.companySettings.deleteMany({ where: { organizationId } });
    await db.organization.delete({ where: { id: organizationId } });
  }
}
