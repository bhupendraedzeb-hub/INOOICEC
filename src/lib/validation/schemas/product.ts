import { z } from "zod";
import { decimalString } from "@/lib/validation/decimal";

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
