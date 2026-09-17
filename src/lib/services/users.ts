import argon2 from "argon2";
import { db } from "@/lib/db";
import type { CreateUserInput } from "@/lib/validation/schemas/user";

export class EmailAlreadyRegisteredError extends Error {}

export async function listOrgUsers(organizationId: string) {
  return db.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOrgUser(id: string, organizationId: string) {
  return db.user.findFirst({
    where: { id, organizationId },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}

export async function createOrgUser(organizationId: string, input: CreateUserInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new EmailAlreadyRegisteredError("An account with this email already exists");

  const passwordHash = await argon2.hash(input.password);
  return db.user.create({
    data: { organizationId, name: input.name, email: input.email, passwordHash, role: input.role, isActive: true },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}

// Deactivated, never deleted — a user row is referenced by createdBy/actor
// relations across Invoice/Payment/Template/AuditLog/etc.; hard-deleting it
// would either cascade-destroy those records or require making the FK
// nullable everywhere. isActive: false is already what auth.ts's login and
// session-revalidation checks gate on.
export async function deactivateOrgUser(id: string, organizationId: string) {
  await db.user.findFirstOrThrow({ where: { id, organizationId } });
  return db.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}
