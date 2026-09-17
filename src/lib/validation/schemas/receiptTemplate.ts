import { z } from "zod";
import { templateDocumentSchema } from "@/lib/validation/schemas/template";

// Same document shape as invoice templates (src/types/template.ts's
// TemplateDocument is generic, not invoice-specific) — reused as-is.
export const receiptTemplateMetadataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullish(),
  thumbnailUrl: z.string().url().nullish().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  isDefault: z.boolean().optional(),
});

export type ReceiptTemplateMetadataInput = z.infer<typeof receiptTemplateMetadataSchema>;

export const createReceiptVersionSchema = z.object({
  layout: templateDocumentSchema,
});

export type CreateReceiptVersionInput = z.infer<typeof createReceiptVersionSchema>;
