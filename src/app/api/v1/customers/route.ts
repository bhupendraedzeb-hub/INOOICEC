import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { customerSchema } from "@/lib/validation/schemas/customer";
import { listCustomers, createCustomer } from "@/lib/services/customers";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(
  null,
  async ({ request, session }) => {
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
    const customers = await listCustomers(session.user.organizationId, { q, includeArchived });
    return NextResponse.json(customers);
  },
  { scope: "customers:read" },
);

export const POST = withAuthedJson(
  customerSchema,
  async ({ session, body }) => {
    if (!body.name.trim()) throw new ApiError(422, "Name is required");
    const customer = await createCustomer(body, session.user.organizationId);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "customer.created",
      entityType: "Customer",
      entityId: customer.id,
    });
    return NextResponse.json(customer, { status: 201 });
  },
  { scope: "customers:write" },
);
