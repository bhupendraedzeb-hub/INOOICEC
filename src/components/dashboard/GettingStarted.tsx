import Link from "next/link";

type Step = { label: string; done: boolean; href: string; cta: string };

function StepRow({ step, index }: { step: Step; index: number }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          step.done
            ? "bg-emerald-600 text-white dark:bg-emerald-500"
            : "border border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
        }`}
      >
        {step.done ? "✓" : index + 1}
      </span>
      <span className={`flex-1 text-sm ${step.done ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300"}`}>
        {step.label}
      </span>
      {!step.done && (
        <Link href={step.href} className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50">
          {step.cta} →
        </Link>
      )}
    </li>
  );
}

// Shown on the dashboard only until an organization has issued/drafted its
// first invoice — a brand-new signup otherwise lands on a completely empty
// dashboard with no indication of what to do next. Stateless by design (no
// dismiss flag to persist): it simply stops rendering once hasInvoice flips
// true, which happens naturally as part of the one real workflow this is
// guiding the user toward.
export function GettingStarted({
  hasCompanyDetails,
  hasCustomer,
  hasInvoice,
}: {
  hasCompanyDetails: boolean;
  hasCustomer: boolean;
  hasInvoice: boolean;
}) {
  if (hasInvoice) return null;

  const steps: Step[] = [
    { label: "Confirm your company details (GSTIN, address, bank details)", done: hasCompanyDetails, href: "/settings/company", cta: "Open settings" },
    { label: "Add your first customer", done: hasCustomer, href: "/customers/new", cta: "Add customer" },
    { label: "Create your first invoice", done: false, href: "/invoices/new", cta: "New invoice" },
  ];

  return (
    <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Get started</h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        A default invoice template is already set up for you — three steps to your first invoice.
      </p>
      <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
        {steps.map((step, i) => (
          <StepRow key={step.label} step={step} index={i} />
        ))}
      </ul>
    </div>
  );
}
