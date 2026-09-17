import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { productSchema } from "@/lib/validation/schemas/product";
import { listProducts, createProduct } from "@/lib/services/products";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(
  null,
  async ({ request, session }) => {
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
    const products = await listProducts(session.user.organizationId, { q, includeArchived });
    return NextResponse.json(products);
  },
  { scope: "products:read" },
);

export const POST = withAuthedJson(
  productSchema,
  async ({ session, body }) => {
    const product = await createProduct(body, session.user.organizationId);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "product.created",
      entityType: "Product",
      entityId: product.id,
    });
    return NextResponse.json(product, { status: 201 });
  },
  { scope: "products:write" },
);
