import type { ComponentNode, ComponentType, ItemsTableProps, TemplateDocument } from "@/types/template";
import type { RenderContext } from "@/lib/render/fieldResolver";

// Structural blocks that only make sense once, after every item row is
// accounted for — repeating Totals/Terms/etc. on every intermediate page of
// a long invoice would duplicate (and, for Totals, mislead about) the final
// numbers. Everything else (header, business/customer/invoice details,
// logo, decorative text/image/divider/shape/qrcode) repeats on every page,
// which is what plan.md's "repeated headers" requirement means for a
// template made of absolutely-positioned blocks rather than normal document
// flow.
const LAST_PAGE_ONLY: ComponentType[] = ["totals", "taxSummary", "paymentDetails", "signature", "terms", "notes"];

// Rough row-height estimate for the itemsTable's text-xs/px-1/py-0.5 cells,
// used only to decide how many item rows fit in one page's itemsTable box.
// Not pixel-perfect against real font metrics, but preview and PDF share
// this exact estimate (same paginateDocument call), so what's shown in the
// live preview is exactly what prints — consistency matters more than
// precision here.
const HEADER_ROW_HEIGHT_MM = 6;
const ITEM_ROW_HEIGHT_MM = 6;

export type RenderPage = {
  document: TemplateDocument;
  context: RenderContext;
  // Whether this page's itemsTable should render its <thead> — honors
  // ItemsTableProps.repeatHeaderOnEachPage (false = header only on page 1).
  showItemsTableHeader: boolean;
};

function findItemsTable(components: ComponentNode[]): ComponentNode | undefined {
  return components.find((c) => c.type === "itemsTable");
}

// Splits a resolved TemplateDocument + RenderContext into one or more
// physical pages when the itemsTable's row count exceeds what fits in its
// box height. Every page keeps the same layout — only the itemsTable's row
// slice and the LAST_PAGE_ONLY components differ page to page. A document
// with no itemsTable, or whose items all fit on one page, always returns
// exactly one page (the common, non-paginated case).
export function paginateDocument(document: TemplateDocument, context: RenderContext): RenderPage[] {
  const itemsTable = findItemsTable(document.components);
  const items = context.items ?? [];

  if (!itemsTable || items.length === 0) {
    return [{ document, context, showItemsTableHeader: true }];
  }

  const repeatHeader = (itemsTable.props as ItemsTableProps).repeatHeaderOnEachPage;
  const availableMm = Math.max(itemsTable.height - HEADER_ROW_HEIGHT_MM, ITEM_ROW_HEIGHT_MM);
  const rowsPerPage = Math.max(1, Math.floor(availableMm / ITEM_ROW_HEIGHT_MM));

  if (items.length <= rowsPerPage) {
    return [{ document, context, showItemsTableHeader: true }];
  }

  const chunks: NonNullable<RenderContext["items"]>[] = [];
  for (let i = 0; i < items.length; i += rowsPerPage) {
    chunks.push(items.slice(i, i + rowsPerPage));
  }

  return chunks.map((chunk, pageIndex) => {
    const isLastPage = pageIndex === chunks.length - 1;
    const components = document.components.filter((c) => isLastPage || !LAST_PAGE_ONLY.includes(c.type));
    return {
      document: { ...document, components },
      context: { ...context, items: chunk },
      showItemsTableHeader: pageIndex === 0 || repeatHeader,
    };
  });
}
