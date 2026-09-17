import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { productSchema, type ProductInput } from "@/lib/validation/schemas/product";
import { getProduct, updateProduct } from "@/lib/services/products";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const product = await getProduct(params.id, session.user.organizationId);
    if (!product) throw new ApiError(404, "Product not found");
    return NextResponse.json(product);
  },
  { scope: "products:read" },
);

export const PUT = withAuthedJson<ProductInput, { id: string }>(
  productSchema,
  async ({ session, body, params }) => {
    const existing = await getProduct(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Product not found");
    const product = await updateProduct(params.id, session.user.organizationId, body);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "product.updated",
      entityType: "Product",
      entityId: product.id,
    });
    return NextResponse.json(product);
  },
  { scope: "products:write" },
);
