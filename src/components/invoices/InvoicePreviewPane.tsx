"use client";

import { MultiPageRenderer } from "@/lib/render/MultiPageRenderer";
import { pageWidthMm, pageHeightMm } from "@/lib/render/TemplateRenderer";
import { paginateDocument } from "@/lib/render/paginate";
import type { TemplateDocument } from "@/types/template";
import type { RenderContext } from "@/lib/render/fieldResolver";

const CSS_PX_PER_MM = 96 / 25.4;
const ZOOM = 0.6;

export function InvoicePreviewPane({
  layout,
  context,
}: {
  layout: TemplateDocument | null;
  context: RenderContext;
}) {
  if (!layout) {
    return (
      <div className="flex h-64 items-center justify-center rounded border border-dashed border-zinc-300 text-sm text-zinc-400 dark:border-zinc-700">
        Select a template to see a preview.
      </div>
    );
  }

  // Same pagination the PDF route uses (MultiPageRenderer -> paginateDocument)
  // — a long item list previews here exactly as many pages as it prints.
  const pageCount = paginateDocument(layout, context).length;
  const widthPx = pageWidthMm(layout.page) * CSS_PX_PER_MM * ZOOM;
  const heightPx = pageHeightMm(layout.page) * CSS_PX_PER_MM * ZOOM * pageCount;

  return (
    <div className="overflow-auto rounded border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div style={{ width: widthPx, height: heightPx }} className="mx-auto">
        <div style={{ width: `${pageWidthMm(layout.page)}mm`, transform: `scale(${ZOOM})`, transformOrigin: "top left" }}>
          <MultiPageRenderer document={layout} context={context} className="mb-2 shadow" />
        </div>
      </div>
      {pageCount > 1 && <p className="mt-2 text-center text-xs text-zinc-400">{pageCount} pages</p>}
    </div>
  );
}
