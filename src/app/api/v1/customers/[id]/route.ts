import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { customerSchema, type CustomerInput } from "@/lib/validation/schemas/customer";
import { getCustomer, updateCustomer } from "@/lib/services/customers";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ params }) => {
    const customer = await getCustomer(params.id);
    if (!customer) throw new ApiError(404, "Customer not found");
    return NextResponse.json(customer);
  },
  { scope: "customers:read" },
);

export const PUT = withAuthedJson<CustomerInput, { id: string }>(
  customerSchema,
  async ({ session, body, params }) => {
    const existing = await getCustomer(params.id);
    if (!existing) throw new ApiError(404, "Customer not found");
    const customer = await updateCustomer(params.id, body);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "customer.updated",
      entityType: "Customer",
      entityId: customer.id,
    });
    return NextResponse.json(customer);
  },
  { scope: "customers:write" },
);
