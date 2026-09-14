import { notFound } from "next/navigation";
import { getProduct } from "@/lib/services/products";
import { ProductForm } from "@/components/products/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Product</h1>
      <div className="mt-6">
        <ProductForm
          productId={product.id}
          initialData={{
            ...product,
            defaultRate: product.defaultRate.toFixed(2),
            gstRate: product.gstRate.toFixed(2),
          }}
        />
      </div>
    </div>
  );
}
