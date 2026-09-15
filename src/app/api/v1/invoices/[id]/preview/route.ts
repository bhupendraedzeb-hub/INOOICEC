import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { resolveInvoiceRenderData } from "@/lib/render/resolveInvoiceRender";

// Pure read/render — never touches numbering, versioning, or status. Safe to
// call unlimited times, including for a still-DRAFT invoice. Returns the
// layout (pinned TemplateVersion if issued, else the template's latest) plus
// the resolved RenderContext, for a client to feed into TemplateRenderer.
// Shares its data assembly with the Phase 12 internal PDF render route via
// resolveInvoiceRenderData.
export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ params }) => {
    const data = await resolveInvoiceRenderData(params.id);
    if (!data) throw new ApiError(404, "Invoice not found");
    return NextResponse.json(data);
  },
  { scope: "invoices:read" },
);
