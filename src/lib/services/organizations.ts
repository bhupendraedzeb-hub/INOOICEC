import argon2 from "argon2";
import { db } from "@/lib/db";
import type { SignupInput } from "@/lib/validation/schemas/auth";
import { STARTER_INVOICE_LAYOUT, STARTER_RECEIPT_LAYOUT } from "@/types/template";
import type { Prisma } from "@/generated/prisma/client";

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
  return provisionOrganizationAndOwner({
    organizationName: input.organizationName,
    email: input.email,
    name: input.name,
    passwordHash,
  });
}

// Shared by the credentials /signup flow above and the Google OAuth
// first-sign-in path (auth.ts's custom adapter.createUser) — both create a
// brand-new, fully isolated Organization with this user as its OWNER, and
// both need the same starter templates provisioned so the org can invoice
// immediately. passwordHash is omitted (left null) for OAuth-created users,
// who have no password — see the User.passwordHash comment in schema.prisma.
export async function provisionOrganizationAndOwner(input: {
  organizationName: string;
  email: string;
  name: string;
  passwordHash?: string;
}) {
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
        passwordHash: input.passwordHash,
        role: "OWNER",
        isActive: true,
      },
    });

    // A brand-new organization otherwise starts with zero templates, and a
    // Template's first version always starts as a blank A4 page
    // (DEFAULT_TEMPLATE_DOCUMENT) — meaning a first-time user would have to
    // build an entire invoice layout by hand in the drag-and-drop builder
    // before they could issue a single invoice. Auto-provisioning one real,
    // ACTIVE, default template per document kind here removes that barrier:
    // a new org can invoice immediately, and can still restyle/replace this
    // template in the builder like any other.
    const invoiceTemplate = await tx.template.create({
      data: {
        organizationId: organization.id,
        name: "Default Invoice Template",
        status: "ACTIVE",
        isDefault: true,
        createdById: user.id,
      },
    });
    await tx.templateVersion.create({
      data: {
        templateId: invoiceTemplate.id,
        versionNumber: 1,
        layout: STARTER_INVOICE_LAYOUT as unknown as Prisma.InputJsonValue,
        createdById: user.id,
      },
    });

    const receiptTemplate = await tx.receiptTemplate.create({
      data: {
        organizationId: organization.id,
        name: "Default Receipt Template",
        status: "ACTIVE",
        isDefault: true,
        createdById: user.id,
      },
    });
    await tx.receiptTemplateVersion.create({
      data: {
        templateId: receiptTemplate.id,
        versionNumber: 1,
        layout: STARTER_RECEIPT_LAYOUT as unknown as Prisma.InputJsonValue,
        createdById: user.id,
      },
    });

    return { organization, user };
  });
}
