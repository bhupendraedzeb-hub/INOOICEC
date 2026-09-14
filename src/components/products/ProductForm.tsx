"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/validation/schemas/product";

export function ProductForm({
  productId,
  initialData,
}: {
  productId?: string;
  initialData?: Partial<ProductInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", defaultRate: "0.00", gstRate: "0.00", ...initialData },
  });

  async function onSubmit(data: ProductInput) {
    setServerError(null);
    const url = productId ? `/api/v1/products/${productId}` : "/api/v1/products";
    const res = await fetch(url, {
      method: productId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setServerError("Failed to save product.");
      return;
    }
    router.push("/products");
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
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">HSN/SAC</label>
        <input {...register("hsnSac")} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Default rate</label>
        <input {...register("defaultRate")} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        {errors.defaultRate && <span className="text-xs text-red-600">{errors.defaultRate.message}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">GST %</label>
        <input {...register("gstRate")} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        {errors.gstRate && <span className="text-xs text-red-600">{errors.gstRate.message}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Unit</label>
        <input {...register("unit")} placeholder="e.g. pcs, hrs, kg" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </div>
      {productId && (
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" {...register("isArchived")} />
          Archived (hidden from selection when creating invoices)
        </label>
      )}
      {serverError && <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Saving…" : productId ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
