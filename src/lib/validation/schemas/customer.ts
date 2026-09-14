import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().nullish(),
  gstin: z.string().nullish(),
  pan: z.string().nullish(),
  billingAddress: z.string().nullish(),
  shippingAddress: z.string().nullish(),
  state: z.string().nullish(),
  stateCode: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  isArchived: z.boolean().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const customerListQuerySchema = z.object({
  q: z.string().optional(),
  includeArchived: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});
