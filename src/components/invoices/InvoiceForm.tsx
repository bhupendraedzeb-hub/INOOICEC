"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateInvoiceTotals } from "@/lib/calc/gstEngine";
import { toMoneyString } from "@/lib/calc/money";
import { buildRenderContext } from "@/lib/render/buildRenderContext";
import { InvoiceItemsEditor, type ProductOption } from "@/components/invoices/InvoiceItemsEditor";
import { InvoicePreviewPane } from "@/components/invoices/InvoicePreviewPane";
import type { InvoiceInput, InvoiceItemInput } from "@/lib/validation/schemas/invoice";
import type { TemplateDocument } from "@/types/template";

type TemplateOption = { id: string; name: string; status: string };
type CustomerOption = { id: string; name: string; stateCode: string | null };

type CompanyForForm = {
  name: string;
  logoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  stateCode: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  currency: string;
};

const inputCls = "rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function InvoiceForm({
  invoiceId,
  templates,
  customers,
  products,
  company,
  initial,
}: {
  invoiceId?: string;
  templates: TemplateOption[];
  customers: CustomerOption[];
  products: ProductOption[];
  company: CompanyForForm;
  initial?: {
    templateId: string;
    customerId: string;
    dueDate: string | null;
    notes: string | null;
    terms: string | null;
    items: InvoiceItemInput[];
  };
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(initial?.templateId ?? templates[0]?.id ?? "");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [items, setItems] = useState<InvoiceItemInput[]>(
    initial?.items ?? [
      { productId: null, description: "", hsnSac: null, quantity: "1", unit: null, rate: "0.00", discount: "0.00", gstRate: "0.00" },
    ],
  );
  const [layout, setLayout] = useState<TemplateDocument | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    fetch(`/api/v1/templates/${templateId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLayout(data.latestVersion?.layout ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  // Masked here rather than reset via setState inside the effect above (React
  // discourages synchronous setState in an effect body) — functionally
  // identical: no template selected means no layout to show.
  const effectiveLayout = templateId ? layout : null;

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const calc = useMemo(
    () =>
      calculateInvoiceTotals(
        items.map((item) => ({
          quantity: item.quantity || "0",
          rate: item.rate || "0",
          discount: item.discount || "0",
          gstRatePercent: item.gstRate || "0",
        })),
        { companyStateCode: company.stateCode ?? "", customerStateCode: selectedCustomer?.stateCode ?? "" },
      ),
    [items, company.stateCode, selectedCustomer?.stateCode],
  );

  const context = buildRenderContext({
    company,
    customer: {
      name: selectedCustomer?.name ?? "Customer",
      companyName: null,
      gstin: null,
      billingAddress: null,
      shippingAddress: null,
      phone: null,
      email: null,
    },
    invoice: {
      invoiceNumber: null,
      issueDateIso: null,
      dueDateIso: dueDate || null,
      status: "DRAFT",
      subtotal: toMoneyString(calc.subtotal),
      discountTotal: toMoneyString(calc.discountTotal),
      taxableAmount: toMoneyString(calc.taxableAmount),
      cgstTotal: toMoneyString(calc.cgstTotal),
      sgstTotal: toMoneyString(calc.sgstTotal),
      igstTotal: toMoneyString(calc.igstTotal),
      taxTotal: toMoneyString(calc.taxTotal),
      roundOff: toMoneyString(calc.roundOff),
      grandTotal: toMoneyString(calc.grandTotal),
      paidTotal: "0.00",
      balanceDue: toMoneyString(calc.grandTotal),
      notes: notes || null,
      terms: terms || null,
    },
    // calc.lines is produced by mapping over `items` 1:1 (see calc above), so
    // calc.lines[i] always exists here.
    items: items.map((item, i) => ({
      description: item.description || "(no description)",
      hsnSac: item.hsnSac ?? null,
      quantity: item.quantity || "0",
      unit: item.unit ?? null,
      rate: item.rate || "0.00",
      discount: item.discount || "0.00",
      gstRate: item.gstRate || "0.00",
      taxAmount: toMoneyString(calc.lines[i].taxAmount),
      lineTotal: toMoneyString(calc.lines[i].lineTotal),
    })),
  });

  async function save() {
    setSaveState("saving");
    setErrorMessage(null);
    const payload: InvoiceInput = {
      templateId,
      customerId,
      dueDate: dueDate || null,
      notes: notes || null,
      terms: terms || null,
      items,
    };
    const url = invoiceId ? `/api/v1/invoices/${invoiceId}` : "/api/v1/invoices";
    const res = await fetch(url, {
      method: invoiceId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMessage(body.error ?? "Failed to save invoice.");
      setSaveState("error");
      return;
    }
    const saved = await res.json();
    router.push(`/invoices/${saved.id}`);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Template</label>
            <select className={inputCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Customer</label>
            <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Due date</label>
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Items</h3>
          <InvoiceItemsEditor items={items} onChange={setItems} products={products} />
        </div>

        <div className="ml-auto w-64 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Subtotal</span>
            <span>{toMoneyString(calc.subtotal)}</span>
          </div>
          {calc.isInterState ? (
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>IGST</span>
              <span>{toMoneyString(calc.igstTotal)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>CGST</span>
                <span>{toMoneyString(calc.cgstTotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>SGST</span>
                <span>{toMoneyString(calc.sgstTotal)}</span>
              </div>
            </>
          )}
          <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
            <span>Grand Total</span>
            <span>{toMoneyString(calc.grandTotal)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Notes</label>
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Terms</label>
            <textarea className={inputCls} rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </div>

        {errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saveState === "saving" || !templateId || !customerId}
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {saveState === "saving" ? "Saving…" : "Save Draft"}
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Live Preview</h3>
        <InvoicePreviewPane layout={effectiveLayout} context={context} />
      </div>
    </div>
  );
}
