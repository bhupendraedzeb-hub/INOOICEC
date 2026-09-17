import argon2 from "argon2";
import { db } from "@/lib/db";
import type { SignupInput } from "@/lib/validation/schemas/auth";

export class EmailAlreadyRegisteredError extends Error {}

// Public signup creates a brand-new, fully isolated Organization — never
// joins an existing one (this app is flat multi-tenant: one user belongs to
// exactly one organization, chosen once at signup). The signup user always
// becomes that organization's OWNER, and organizationName doubles as the
// initial CompanySettings.name so the form only has to ask once. Reused
// as-is by prisma/seed.ts for the initial bootstrap organization.
export async function signupOrganization(input: SignupInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new EmailAlreadyRegisteredError("An account with this email already exists");

  const passwordHash = await argon2.hash(input.password);

  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: { name: input.organizationName } });
    await tx.companySettings.create({
      data: { organizationId: organization.id, name: input.organizationName },
    });
    const user = await tx.user.create({
      data: {
        organizationId: organization.id,
        email: input.email,
        name: input.name,
        passwordHash,
        role: "OWNER",
        isActive: true,
      },
    });
    return { organization, user };
  });
}
