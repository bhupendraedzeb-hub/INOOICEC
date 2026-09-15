import { notFound } from "next/navigation";
import { resolveInvoiceRenderData } from "@/lib/render/resolveInvoiceRender";
import { MultiPageRenderer } from "@/lib/render/MultiPageRenderer";

// Server-only render target for Phase 12's Playwright PDF pipeline
// (lib/pdf/printInvoice.ts) — not linked from anywhere in the dashboard UI.
// It sits outside the (dashboard) route group so it inherits only the bare
// root layout (fonts + globals.css), never the dashboard nav chrome, and
// shares its data assembly with the /preview API route and the invoice
// detail page's on-screen preview via resolveInvoiceRenderData — the same
// "preview and PDF use the same rendering logic" requirement plan.md calls
// out, now true at both the data layer and the component tree
// (MultiPageRenderer/TemplateRenderer).
//
// Gated by a shared-secret query token instead of a NextAuth session, since
// the only caller is this server's own Playwright process (lib/pdf/printInvoice.ts),
// not a browser with a login cookie. A missing/mismatched token 404s rather
// than 401/403, so a guess at this URL can't distinguish "wrong token" from
// "invoice doesn't exist."
export default async function InternalInvoiceRenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { invoiceId } = await params;
  const { token } = await searchParams;
  const expected = process.env.INTERNAL_RENDER_TOKEN_SECRET;
  if (!expected || token !== expected) notFound();

  const data = await resolveInvoiceRenderData(invoiceId);
  if (!data || !data.layout) notFound();

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <MultiPageRenderer document={data.layout} context={data.context} />
    </>
  );
}
