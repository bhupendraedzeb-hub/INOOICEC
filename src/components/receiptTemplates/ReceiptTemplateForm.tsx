"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  receiptTemplateMetadataSchema,
  type ReceiptTemplateMetadataInput,
} from "@/lib/validation/schemas/receiptTemplate";

export function ReceiptTemplateForm({
  templateId,
  initialData,
}: {
  templateId?: string;
  initialData?: Partial<ReceiptTemplateMetadataInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReceiptTemplateMetadataInput>({
    resolver: zodResolver(receiptTemplateMetadataSchema),
    defaultValues: { name: "", status: "DRAFT", isDefault: false, ...initialData },
  });

  async function onSubmit(data: ReceiptTemplateMetadataInput) {
    setServerError(null);
    const url = templateId ? `/api/v1/receipt-templates/${templateId}` : "/api/v1/receipt-templates";
    const res = await fetch(url, {
      method: templateId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setServerError("Failed to save receipt template.");
      return;
    }
    const saved = await res.json();
    router.push(templateId ? `/receipt-templates/${templateId}` : `/receipt-templates/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Name</label>
        <input {...register("name")} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Description</label>
        <input {...register("description")} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Thumbnail URL</label>
        <input {...register("thumbnailUrl")} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Status</label>
        <select {...register("status")} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" {...register("isDefault")} />
        Set as default receipt template — new receipts auto-generate against whichever template is marked default
      </label>
      {serverError && <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Saving…" : templateId ? "Save changes" : "Create receipt template"}
        </button>
      </div>
    </form>
  );
}
