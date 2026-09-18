import { z } from "zod";
import { decimalString } from "@/lib/validation/decimal";

export const invoiceItemInputSchema = z.object({
  productId: z.string().nullish(),
  description: z.string().min(1, "Description is required"),
  hsnSac: z.string().nullish(),
  quantity: decimalString,
  unit: z.string().nullish(),
  rate: decimalString,
  discount: decimalString.nullish(),
  gstRate: decimalString,
});

export const invoiceInputSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  customerId: z.string().min(1, "Customer is required"),
  dueDate: z.string().nullish(), // ISO date string
  notes: z.string().nullish(),
  terms: z.string().nullish(),
  // Optional (not .default()) — keeps older API-key clients that don't send
  // these working; the service layer applies the AUTO/false default.
  taxType: z.enum(["AUTO", "FORCE_IGST", "FORCE_CGST_SGST"]).optional(),
  pricesIncludeTax: z.boolean().optional(),
  items: z.array(invoiceItemInputSchema).min(1, "At least one item is required"),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(1, "A cancellation reason is required"),
});
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;

export const invoiceListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(["DRAFT", "ISSUED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"]).optional(),
  customerId: z.string().optional(),
});
