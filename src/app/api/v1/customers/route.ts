import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { customerSchema } from "@/lib/validation/schemas/customer";
import { listCustomers, createCustomer } from "@/lib/services/customers";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(null, async ({ request }) => {
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  const customers = await listCustomers({ q, includeArchived });
  return NextResponse.json(customers);
});

export const POST = withAuthedJson(customerSchema, async ({ session, body }) => {
  if (!body.name.trim()) throw new ApiError(422, "Name is required");
  const customer = await createCustomer(body);
  await writeAuditEvent({
    actorId: session.user.id,
    action: "customer.created",
    entityType: "Customer",
    entityId: customer.id,
  });
  return NextResponse.json(customer, { status: 201 });
});
