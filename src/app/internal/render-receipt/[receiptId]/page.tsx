import { notFound } from "next/navigation";
import { resolveReceiptRenderData } from "@/lib/render/resolveReceiptRender";
import { MultiPageRenderer } from "@/lib/render/MultiPageRenderer";

// Mirrors src/app/internal/render/[invoiceId]/page.tsx exactly — see that
// file's comments for the full rationale (token-gating, 404-not-401 so a
// guess can't distinguish "wrong token" from "receipt doesn't exist",
// shared rendering logic with the eventual /preview route).
export default async function InternalReceiptRenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ receiptId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { receiptId } = await params;
  const { token } = await searchParams;
  const expected = process.env.INTERNAL_RENDER_TOKEN_SECRET;
  if (!expected || token !== expected) notFound();

  const data = await resolveReceiptRenderData(receiptId);
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
