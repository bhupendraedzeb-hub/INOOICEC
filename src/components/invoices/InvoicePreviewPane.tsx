"use client";

import { TemplateRenderer } from "@/lib/render/TemplateRenderer";
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

  const widthPx = 210 * CSS_PX_PER_MM * ZOOM;
  const heightPx = 297 * CSS_PX_PER_MM * ZOOM;

  return (
    <div className="overflow-auto rounded border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div style={{ width: widthPx, height: heightPx }} className="mx-auto shadow">
        <div style={{ width: "210mm", transform: `scale(${ZOOM})`, transformOrigin: "top left" }}>
          <TemplateRenderer document={layout} context={context} />
        </div>
      </div>
    </div>
  );
}
