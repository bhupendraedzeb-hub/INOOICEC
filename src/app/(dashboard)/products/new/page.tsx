import { ProductForm } from "@/components/products/ProductForm";

export default function NewProductPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New Product</h1>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
