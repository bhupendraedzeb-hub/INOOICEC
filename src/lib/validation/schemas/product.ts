import { z } from "zod";

// Money/rate fields are strings across the API boundary (never JS numbers) —
// see plan.md's "Decimal boundary risk": avoids float coercion, parsed into
// Prisma.Decimal in the service layer.
const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a plain decimal number, e.g. 1234.50");

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullish(),
  hsnSac: z.string().nullish(),
  defaultRate: decimalString,
  gstRate: decimalString,
  unit: z.string().nullish(),
  isArchived: z.boolean().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productListQuerySchema = z.object({
  q: z.string().optional(),
  includeArchived: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});
