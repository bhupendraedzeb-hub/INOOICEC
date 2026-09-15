import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/services/invoices";
import { getLatestVersion } from "@/lib/services/templates";
import { listTemplates } from "@/lib/services/templates";
import { listCustomers } from "@/lib/services/customers";
import { listProducts } from "@/lib/services/products";
import { getCompanySettings } from "@/lib/services/companySettings";
import { buildRenderContext } from "@/lib/render/buildRenderContext";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import { InvoicePreviewPane } from "@/components/invoices/InvoicePreviewPane";
import type { TemplateDocument } from "@/types/template";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  if (invoice.status === "DRAFT") {
    const [templates, customers, products] = await Promise.all([
      listTemplates({}),
      listCustomers({}),
      listProducts({}),
    ]);
    const company = await getCompanySettings();

    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Draft Invoice</h1>
          <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
        </div>
        <InvoiceForm
          invoiceId={invoice.id}
          templates={templates.filter((t) => t.status !== "ARCHIVED")}
          customers={customers}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            hsnSac: p.hsnSac,
            defaultRate: p.defaultRate.toString(),
            gstRate: p.gstRate.toString(),
            unit: p.unit,
          }))}
          company={company}
          initial={{
            templateId: invoice.templateId,
            customerId: invoice.customerId,
            dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : null,
            notes: invoice.notes,
            terms: invoice.terms,
            items: invoice.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              hsnSac: item.hsnSac,
              quantity: item.quantity.toString(),
              unit: item.unit,
              rate: item.rate.toString(),
              discount: item.discount.toString(),
              gstRate: item.gstRate.toString(),
            })),
          }}
        />
      </div>
    );
  }

  // ISSUED or CANCELLED — read-only view, rendered from the pinned template
  // version (issued invoices never re-render from a template's current,
  // possibly-since-edited state).
  const company = await getCompanySettings();
  const version = invoice.templateVersion ?? (await getLatestVersion(invoice.templateId));
  const layout = (version?.layout as unknown as TemplateDocument) ?? null;

  const context = buildRenderContext({
    company,
    customer: invoice.customer,
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      issueDateIso: invoice.issueDate?.toISOString() ?? null,
      dueDateIso: invoice.dueDate?.toISOString() ?? null,
      status: invoice.status,
      subtotal: invoice.subtotal.toString(),
      discountTotal: invoice.discountTotal.toString(),
      taxableAmount: invoice.taxableAmount.toString(),
      cgstTotal: invoice.cgstTotal.toString(),
      sgstTotal: invoice.sgstTotal.toString(),
      igstTotal: invoice.igstTotal.toString(),
      taxTotal: invoice.taxTotal.toString(),
      roundOff: invoice.roundOff.toString(),
      grandTotal: invoice.grandTotal.toString(),
      paidTotal: invoice.paidTotal.toString(),
      balanceDue: invoice.balanceDue.toString(),
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      hsnSac: item.hsnSac,
      quantity: item.quantity.toString(),
      unit: item.unit,
      rate: item.rate.toString(),
      discount: item.discount.toString(),
      gstRate: item.gstRate.toString(),
      taxAmount: item.taxAmount.toString(),
      lineTotal: item.lineTotal.toString(),
    })),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {invoice.invoiceNumber ?? "Invoice"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {invoice.status} · {invoice.paymentStatus.replace("_", " ")} · Customer: {invoice.customer.name}
            {invoice.status === "CANCELLED" && invoice.cancelledReason && (
              <> · Cancelled: {invoice.cancelledReason}</>
            )}
          </p>
        </div>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
      </div>
      <InvoicePreviewPane layout={layout} context={context} />
    </div>
  );
}
