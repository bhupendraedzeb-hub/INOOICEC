import { z } from "zod";

// Money/quantity fields are strings across the API boundary (never JS
// numbers) — see plan.md's "Decimal boundary risk": avoids float coercion,
// parsed into decimal.js/Prisma.Decimal in the service layer.
export const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Must be a plain decimal number, e.g. 1234.50");
