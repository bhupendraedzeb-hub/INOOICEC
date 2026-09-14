import { z } from "zod";

// All fields optional except `name` — matches prisma/schema.prisma's
// CompanySettings model, where everything but name/currency/invoicePrefix/
// invoiceNumberFormat is nullable.
export const companySettingsSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  logoUrl: z.string().url().nullish().or(z.literal("")),

  addressLine1: z.string().nullish(),
  addressLine2: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  stateCode: z.string().nullish(),
  postalCode: z.string().nullish(),
  country: z.string().nullish(),

  gstin: z.string().nullish(),
  pan: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  website: z.string().url().nullish().or(z.literal("")),

  bankName: z.string().nullish(),
  bankAccountHolder: z.string().nullish(),
  bankAccountNumber: z.string().nullish(),
  bankIfsc: z.string().nullish(),
  bankBranch: z.string().nullish(),
  upiId: z.string().nullish(),

  // No z.default() here on purpose: react-hook-form's zodResolver wants the
  // form's input and output types to match exactly, which .default() breaks.
  // Prisma's schema.prisma already defaults these at the DB level, and every
  // read from getCompanySettings() returns concrete values, so the form
  // always has something to submit.
  currency: z.string().min(1),
  invoicePrefix: z.string().min(1),
  invoiceNumberFormat: z.string().min(1),
  defaultPaymentTerms: z.string().nullish(),
  defaultNotes: z.string().nullish(),
  defaultTerms: z.string().nullish(),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
