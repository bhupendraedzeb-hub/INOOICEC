import { db } from "@/lib/db";
import type { ProductInput } from "@/lib/validation/schemas/product";

export async function listProducts(organizationId: string, opts: { q?: string; includeArchived?: boolean }) {
  return db.product.findMany({
    where: {
      organizationId,
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

export async function getProduct(id: string, organizationId: string) {
  return db.product.findFirst({ where: { id, organizationId } });
}

export async function createProduct(data: ProductInput, organizationId: string) {
  return db.product.create({
    data: { ...data, organizationId, defaultRate: data.defaultRate, gstRate: data.gstRate },
  });
}

export async function updateProduct(id: string, organizationId: string, data: ProductInput) {
  await db.product.findFirstOrThrow({ where: { id, organizationId } });
  return db.product.update({
    where: { id },
    data: { ...data, defaultRate: data.defaultRate, gstRate: data.gstRate },
  });
}
