import { ReceiptTemplateForm } from "@/components/receiptTemplates/ReceiptTemplateForm";

export default function NewReceiptTemplatePage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New Receipt Template</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Starts as an empty A4 layout — use the visual builder to design it.
      </p>
      <div className="mt-6">
        <ReceiptTemplateForm />
      </div>
    </div>
  );
}
