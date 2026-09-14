import { TemplateForm } from "@/components/templates/TemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New Template</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Starts as an empty A4 layout — use the visual builder to design it (coming in Phase 5).
      </p>
      <div className="mt-6">
        <TemplateForm />
      </div>
    </div>
  );
}
