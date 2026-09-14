import { db } from "@/lib/db";
import type { CustomerInput } from "@/lib/validation/schemas/customer";

export async function listCustomers(opts: { q?: string; includeArchived?: boolean }) {
  return db.customer.findMany({
    where: {
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

export async function getCustomer(id: string) {
  return db.customer.findUnique({ where: { id } });
}

export async function createCustomer(data: CustomerInput) {
  return db.customer.create({ data: { ...data, email: data.email || null } });
}

export async function updateCustomer(id: string, data: CustomerInput) {
  return db.customer.update({ where: { id }, data: { ...data, email: data.email || null } });
}
