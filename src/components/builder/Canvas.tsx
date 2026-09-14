"use client";

import { createContext, useContext, useRef, type CSSProperties } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { TemplateRenderer, pageWidthMm, pageHeightMm, type ComponentWrapperProps } from "@/lib/render/TemplateRenderer";
import type { TemplateDocument } from "@/types/template";

// CSS's own mm->px conversion (1in = 96px = 25.4mm) — the *physical* scale at
// which `left: Xmm` etc. render. `zoom` on top of this is purely a UI
// convenience for comfortable on-screen editing; it never touches the
// document's stored mm values.
export const CSS_PX_PER_MM = 96 / 25.4;

type CanvasCtx = {
  effectiveScale: number; // CSS_PX_PER_MM * zoom — px per mm actually on screen
  zoom: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveBy: (id: string, dxMm: number, dyMm: number) => void;
  onResize: (id: string, widthMm: number, heightMm: number) => void;
};

const noop = () => {};
const DEFAULT_CTX: CanvasCtx = {
  effectiveScale: CSS_PX_PER_MM,
  zoom: 1,
  selectedId: null,
  onSelect: noop,
  onMoveBy: noop,
  onResize: noop,
};

const CanvasEditContext = createContext<CanvasCtx>(DEFAULT_CTX);

function EditableWrapper({ component, style, children }: ComponentWrapperProps) {
  const ctx = useContext(CanvasEditContext);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: component.id,
    data: { source: "canvas-item", componentId: component.id },
    disabled: component.locked,
  });
  const selected = ctx.selectedId === component.id;
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const dragStyle: CSSProperties = transform
    ? { transform: `translate3d(${transform.x / ctx.zoom}px, ${transform.y / ctx.zoom}px, 0)` }
    : {};

  function startResize(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    resizeStart.current = { x: e.clientX, y: e.clientY, width: component.width, height: component.height };

    function onMove(ev: PointerEvent) {
      if (!resizeStart.current) return;
      const dxMm = (ev.clientX - resizeStart.current.x) / ctx.effectiveScale;
      const dyMm = (ev.clientY - resizeStart.current.y) / ctx.effectiveScale;
      ctx.onResize(component.id, Math.max(5, resizeStart.current.width + dxMm), Math.max(5, resizeStart.current.height + dyMm));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...dragStyle,
        outline: selected ? "2px solid #2563eb" : component.locked ? "1px dashed #a1a1aa" : "1px solid transparent",
        cursor: component.locked ? "default" : "grab",
      }}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onSelect(component.id);
      }}
      {...(component.locked ? {} : listeners)}
      {...attributes}
    >
      {children}
      {selected && !component.locked && (
        <div
          onPointerDown={startResize}
          className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-white bg-blue-600"
          style={{ zIndex: 9999 }}
        />
      )}
    </div>
  );
}

export function Canvas({
  document,
  zoom,
  selectedId,
  onSelect,
  onMoveBy,
  onResize,
}: {
  document: TemplateDocument;
  zoom: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveBy: (id: string, dxMm: number, dyMm: number) => void;
  onResize: (id: string, widthMm: number, heightMm: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });
  const effectiveScale = CSS_PX_PER_MM * zoom;
  const widthPx = pageWidthMm(document.page) * effectiveScale;
  const heightPx = pageHeightMm(document.page) * effectiveScale;

  return (
    <div
      className="flex-1 overflow-auto bg-zinc-100 p-8 dark:bg-zinc-950"
      onClick={() => onSelect(null)}
    >
      <div
        ref={setNodeRef}
        style={{ width: widthPx, height: heightPx }}
        className={`relative mx-auto shadow-lg ${isOver ? "ring-2 ring-blue-400" : ""}`}
      >
        <div style={{ width: `${pageWidthMm(document.page)}mm`, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <CanvasEditContext.Provider value={{ effectiveScale, zoom, selectedId, onSelect, onMoveBy, onResize }}>
            <TemplateRenderer document={document} Wrapper={EditableWrapper} />
          </CanvasEditContext.Provider>
        </div>
      </div>
    </div>
  );
}
