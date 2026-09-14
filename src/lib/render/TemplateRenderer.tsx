import type { CSSProperties, ComponentType, ReactNode } from "react";
import type { BaseStyle, ComponentNode, ComponentProps, TemplateDocument } from "@/types/template";
import { ComponentContent } from "@/lib/render/components";
import type { RenderContext } from "@/lib/render/fieldResolver";

// The shared render tree: the builder canvas, the invoice preview, and the
// PDF print route (Phase 12) all render a TemplateDocument through this same
// component, so what the user designs is exactly what prints. No "use
// client" here on purpose — it must also work from the server-rendered PDF
// route. Editing-only chrome (selection ring, drag handles, resize handles)
// is injected by the caller via `Wrapper`, never baked in here.

export type ComponentWrapperProps = {
  component: ComponentNode;
  style: CSSProperties;
  children: ReactNode;
};

function DefaultWrapper({ style, children }: ComponentWrapperProps) {
  return <div style={style}>{children}</div>;
}

function styleFromProps(props: ComponentProps): CSSProperties {
  const p = props as Partial<BaseStyle>;
  return {
    fontFamily: p.font,
    fontSize: p.fontSize,
    fontWeight: p.fontWeight,
    textAlign: p.align,
    color: p.color,
    background: p.background,
    borderColor: p.borderColor,
    borderWidth: p.borderWidth,
    borderStyle: p.borderWidth ? "solid" : undefined,
    padding: p.paddingMm !== undefined ? `${p.paddingMm}mm` : undefined,
    margin: p.marginMm !== undefined ? `${p.marginMm}mm` : undefined,
    overflow: "hidden",
  };
}

export function pageWidthMm(page: TemplateDocument["page"]) {
  return page.orientation === "landscape" ? 297 : 210;
}

export function pageHeightMm(page: TemplateDocument["page"]) {
  return page.orientation === "landscape" ? 210 : 297;
}

export function TemplateRenderer({
  document,
  context,
  Wrapper = DefaultWrapper,
}: {
  document: TemplateDocument;
  // Omit (design mode / builder canvas) to render FieldRefs as path chips;
  // pass a real RenderContext (invoice preview, PDF — Phase 9+) to resolve
  // them to actual values.
  context?: RenderContext;
  Wrapper?: ComponentType<ComponentWrapperProps>;
}) {
  const { page, components } = document;

  return (
    <div
      className="template-page bg-white text-black"
      style={{
        position: "relative",
        width: `${pageWidthMm(page)}mm`,
        height: `${pageHeightMm(page)}mm`,
        paddingTop: `${page.marginTopMm}mm`,
        paddingRight: `${page.marginRightMm}mm`,
        paddingBottom: `${page.marginBottomMm}mm`,
        paddingLeft: `${page.marginLeftMm}mm`,
        boxSizing: "border-box",
      }}
    >
      {components
        .filter((c) => c.visible)
        .map((c) => {
          const style: CSSProperties = {
            position: "absolute",
            left: `${c.x}mm`,
            top: `${c.y}mm`,
            width: `${c.width}mm`,
            height: `${c.height}mm`,
            zIndex: c.zIndex,
            ...styleFromProps(c.props),
          };
          return (
            <Wrapper key={c.id} component={c} style={style}>
              <ComponentContent component={c} context={context} />
            </Wrapper>
          );
        })}
    </div>
  );
}
