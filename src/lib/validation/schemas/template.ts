import { z } from "zod";

const fieldRefSchema = z.object({
  kind: z.literal("field"),
  path: z.string().min(1),
  fallback: z.string().optional(),
});

const richContentSchema = z.array(z.union([z.string(), fieldRefSchema]));

const baseStyleSchema = z.object({
  font: z.string().optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  color: z.string().optional(),
  background: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().nonnegative().optional(),
  paddingMm: z.number().nonnegative().optional(),
  marginMm: z.number().nonnegative().optional(),
});

const itemsTableColumnKey = z.enum([
  "index",
  "item",
  "description",
  "hsn",
  "qty",
  "unit",
  "rate",
  "discount",
  "gstPercent",
  "taxAmount",
  "amount",
]);

const baseComponentFields = {
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  locked: z.boolean(),
  visible: z.boolean(),
  zIndex: z.number().int(),
};

const componentSchema = z.discriminatedUnion("type", [
  z.object({ ...baseComponentFields, type: z.literal("text"), props: baseStyleSchema.extend({ content: richContentSchema }) }),
  z.object({
    ...baseComponentFields,
    type: z.literal("image"),
    props: z.object({ src: z.union([z.string(), fieldRefSchema]), fit: z.enum(["contain", "cover"]).optional() }),
  }),
  z.object({ ...baseComponentFields, type: z.literal("logo"), props: z.object({ fit: z.enum(["contain", "cover"]).optional() }) }),
  z.object({
    ...baseComponentFields,
    type: z.literal("divider"),
    props: z.object({ color: z.string().optional(), thickness: z.number().positive().optional() }),
  }),
  z.object({
    ...baseComponentFields,
    type: z.literal("shape"),
    props: baseStyleSchema.extend({ shape: z.enum(["rect", "circle", "line"]) }),
  }),
  z.object({
    ...baseComponentFields,
    type: z.literal("qrcode"),
    props: baseStyleSchema.extend({
      source: z.union([z.literal("upi"), z.literal("customUrl"), z.object({ field: fieldRefSchema })]),
    }),
  }),
  z.object({
    ...baseComponentFields,
    type: z.literal("itemsTable"),
    props: baseStyleSchema.extend({
      columns: z.array(
        z.object({ key: itemsTableColumnKey, label: z.string().min(1), widthPercent: z.number().positive() }),
      ),
      repeatHeaderOnEachPage: z.boolean(),
    }),
  }),
  ...(
    [
      "header",
      "businessDetails",
      "customerDetails",
      "invoiceDetails",
      "taxSummary",
      "totals",
      "paymentDetails",
      "signature",
      "terms",
      "notes",
      "footer",
    ] as const
  ).map((type) => z.object({ ...baseComponentFields, type: z.literal(type), props: baseStyleSchema })),
]);

export const templateDocumentSchema = z.object({
  page: z.object({
    size: z.literal("A4"),
    orientation: z.enum(["portrait", "landscape"]),
    marginTopMm: z.number().nonnegative(),
    marginRightMm: z.number().nonnegative(),
    marginBottomMm: z.number().nonnegative(),
    marginLeftMm: z.number().nonnegative(),
  }),
  components: z.array(componentSchema),
});

export const templateMetadataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullish(),
  thumbnailUrl: z.string().url().nullish().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  isDefault: z.boolean().optional(),
});

export type TemplateMetadataInput = z.infer<typeof templateMetadataSchema>;

export const createVersionSchema = z.object({
  layout: templateDocumentSchema,
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;
