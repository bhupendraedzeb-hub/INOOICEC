import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getInvoice } from "@/lib/services/invoices";
import { listTemplates } from "@/lib/services/templates";
import { listCustomers } from "@/lib/services/customers";
import { listProducts } from "@/lib/services/products";
import { getCompanySettings } from "@/lib/services/companySettings";
import { resolveInvoiceRenderData } from "@/lib/render/resolveInvoiceRender";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import { InvoicePreviewPane } from "@/components/invoices/InvoicePreviewPane";
import { PaymentForm } from "@/components/invoices/PaymentForm";
import { PaymentTimeline } from "@/components/invoices/PaymentTimeline";
import { PaymentLinkForm } from "@/components/invoices/PaymentLinkForm";
import { PaymentLinkList } from "@/components/invoices/PaymentLinkList";
import { listPayments } from "@/lib/services/payments";
import { listPaymentLinks } from "@/lib/services/paymentLinks";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const { id } = await params;
  const invoice = await getInvoice(id, organizationId);
  if (!invoice) notFound();

  if (invoice.status === "DRAFT") {
    const [templates, customers, products] = await Promise.all([
      listTemplates(organizationId, {}),
      listCustomers(organizationId, {}),
      listProducts(organizationId, {}),
    ]);
    const company = await getCompanySettings(organizationId);

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
            taxType: invoice.taxType,
            pricesIncludeTax: invoice.pricesIncludeTax,
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
  // possibly-since-edited state). Shares its data assembly with the Phase 12
  // internal PDF render route via resolveInvoiceRenderData.
  const [renderData, payments, paymentLinks] = await Promise.all([
    resolveInvoiceRenderData(invoice.id),
    listPayments(organizationId, { invoiceId: invoice.id }),
    listPaymentLinks(organizationId, { invoiceId: invoice.id }),
  ]);
  const { layout, context } = renderData!;

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InvoicePreviewPane layout={layout} context={context} />
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Payments</h3>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              Paid: {invoice.paidTotal.toString()} · Balance: {invoice.balanceDue.toString()}
            </p>
            <PaymentTimeline
              payments={payments.map((p) => ({
                id: p.id,
                amount: p.amount.toString(),
                paymentDate: p.paymentDate.toISOString(),
                method: p.method,
                transactionRef: p.transactionRef,
                notes: p.notes,
                isVoided: p.isVoided,
                voidedReason: p.voidedReason,
                receiptId: p.receipt?.id ?? null,
              }))}
            />
          </div>
          {invoice.status === "ISSUED" && Number(invoice.balanceDue) > 0 && (
            <PaymentForm invoiceId={invoice.id} balanceDue={invoice.balanceDue.toString()} />
          )}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Payment Links</h3>
            <PaymentLinkList
              links={paymentLinks.map((l) => ({
                id: l.id,
                token: l.token,
                amount: l.amount.toString(),
                provider: l.provider,
                status: l.status,
                expiresAt: l.expiresAt?.toISOString() ?? null,
                paidAt: l.paidAt?.toISOString() ?? null,
              }))}
            />
          </div>
          {invoice.status === "ISSUED" && Number(invoice.balanceDue) > 0 && (
            <PaymentLinkForm invoiceId={invoice.id} balanceDue={invoice.balanceDue.toString()} />
          )}
        </div>
      </div>
    </div>
  );
}
