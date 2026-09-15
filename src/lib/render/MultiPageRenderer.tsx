import { TemplateRenderer, pageWidthMm, pageHeightMm } from "@/lib/render/TemplateRenderer";
import { paginateDocument } from "@/lib/render/paginate";
import type { TemplateDocument } from "@/types/template";
import type { RenderContext } from "@/lib/render/fieldResolver";

// Multi-page entry point shared by the invoice preview and the Phase 12 PDF
// route (plan.md: "preview and PDF should use the same rendering logic").
// Splits the document via paginateDocument when there are more item rows
// than one page's itemsTable box can hold, then renders each page through
// the exact same TemplateRenderer the single-page builder canvas uses.
// `breakAfter: "page"` on every page but the last is what makes Chromium's
// page.pdf() (Phase 12) land the page boundary exactly where this component
// already put it, rather than guessing from raw pixel height.
export function MultiPageRenderer({
  document,
  context,
  className,
}: {
  document: TemplateDocument;
  context: RenderContext;
  className?: string;
}) {
  const pages = paginateDocument(document, context);

  return (
    <>
      {pages.map((page, i) => (
        <div
          key={i}
          className={className}
          style={{
            width: `${pageWidthMm(page.document.page)}mm`,
            height: `${pageHeightMm(page.document.page)}mm`,
            breakAfter: i < pages.length - 1 ? "page" : "auto",
          }}
        >
          <TemplateRenderer
            document={page.document}
            context={page.context}
            itemsTableShowHeader={page.showItemsTableHeader}
          />
        </div>
      ))}
    </>
  );
}
