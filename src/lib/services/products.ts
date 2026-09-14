import { db } from "@/lib/db";
import type { ProductInput } from "@/lib/validation/schemas/product";

export async function listProducts(opts: { q?: string; includeArchived?: boolean }) {
  return db.product.findMany({
    where: {
      ...(opts.includeArchived ? {} : { isArchived: false }),
      ...(opts.q
        ? {
            OR: [
              { name: { contains: opts.q, mode: "insensitive" } },
              { hsnSac: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getProduct(id: string) {
  return db.product.findUnique({ where: { id } });
}

export async function createProduct(data: ProductInput) {
  return db.product.create({
    data: { ...data, defaultRate: data.defaultRate, gstRate: data.gstRate },
  });
}

export async function updateProduct(id: string, data: ProductInput) {
  return db.product.update({
    where: { id },
    data: { ...data, defaultRate: data.defaultRate, gstRate: data.gstRate },
  });
}
