import { z } from "zod";
import { decimalString } from "@/lib/validation/decimal";

export const paymentMethodEnum = z.enum(["BANK_TRANSFER", "UPI", "CARD", "CASH", "GATEWAY", "OTHER"]);

export const createPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: decimalString,
  paymentDate: z.string().min(1, "Payment date is required"),
  method: paymentMethodEnum,
  transactionRef: z.string().nullish(),
  notes: z.string().nullish(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z.object({
  amount: decimalString,
  paymentDate: z.string().min(1, "Payment date is required"),
  method: paymentMethodEnum,
  transactionRef: z.string().nullish(),
  notes: z.string().nullish(),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const voidPaymentSchema = z.object({
  reason: z.string().min(1, "A void reason is required"),
});
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
