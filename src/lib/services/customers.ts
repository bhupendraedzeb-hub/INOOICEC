import { db } from "@/lib/db";
import type { CustomerInput } from "@/lib/validation/schemas/customer";

export async function listCustomers(organizationId: string, opts: { q?: string; includeArchived?: boolean }) {
  return db.customer.findMany({
    where: {
      organizationId,
      ...(opts.includeArchived ? {} : { isArchived: false }),
      ...(opts.q
        ? {
            OR: [
              { name: { contains: opts.q, mode: "insensitive" } },
              { companyName: { contains: opts.q, mode: "insensitive" } },
              { email: { contains: opts.q, mode: "insensitive" } },
              { gstin: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getCustomer(id: string, organizationId: string) {
  return db.customer.findFirst({ where: { id, organizationId } });
}

export async function createCustomer(data: CustomerInput, organizationId: string) {
  return db.customer.create({ data: { ...data, organizationId, email: data.email || null } });
}

export async function updateCustomer(id: string, organizationId: string, data: CustomerInput) {
  await db.customer.findFirstOrThrow({ where: { id, organizationId } });
  return db.customer.update({ where: { id }, data: { ...data, email: data.email || null } });
}
