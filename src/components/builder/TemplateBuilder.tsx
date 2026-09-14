"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Palette } from "@/components/builder/Palette";
import { Canvas, CSS_PX_PER_MM } from "@/components/builder/Canvas";
import { PropertiesPanel } from "@/components/builder/PropertiesPanel";
import { createDefaultComponent } from "@/components/builder/componentDefaults";
import { TemplateRenderer } from "@/lib/render/TemplateRenderer";
import type { ComponentNode, ComponentType, TemplateDocument } from "@/types/template";

const ZOOM_LEVELS = [0.5, 0.7, 1, 1.25];

export function TemplateBuilder({
  templateId,
  initialLayout,
  initialVersionNumber,
}: {
  templateId: string;
  initialLayout: TemplateDocument;
  initialVersionNumber: number;
}) {
  const router = useRouter();
  const [document, setDocument] = useState<TemplateDocument>(initialLayout);
  const [past, setPast] = useState<TemplateDocument[]>([]);
  const [future, setFuture] = useState<TemplateDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.7);
  const [previewMode, setPreviewMode] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [versionNumber, setVersionNumber] = useState(initialVersionNumber);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const commit = useCallback(
    (updater: (doc: TemplateDocument) => TemplateDocument) => {
      setDocument((current) => {
        const next = updater(current);
        setPast((p) => [...p, current]);
        setFuture([]);
        return next;
      });
    },
    [],
  );

  function undo() {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setFuture((f) => [document, ...f]);
      setDocument(previous);
      return p.slice(0, -1);
    });
  }

  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, document]);
      setDocument(next);
      return f.slice(1);
    });
  }

  function selectedComponent(): ComponentNode | null {
    return document.components.find((c) => c.id === selectedId) ?? null;
  }

  function updateComponent(updated: ComponentNode) {
    commit((doc) => ({ ...doc, components: doc.components.map((c) => (c.id === updated.id ? updated : c)) }));
  }

  function deleteComponent(id: string) {
    commit((doc) => ({ ...doc, components: doc.components.filter((c) => c.id !== id) }));
    setSelectedId(null);
  }

  function duplicateComponent(id: string) {
    const source = document.components.find((c) => c.id === id);
    if (!source) return;
    const copy: ComponentNode = {
      ...source,
      id: crypto.randomUUID(),
      x: source.x + 10,
      y: source.y + 10,
      zIndex: Math.max(0, ...document.components.map((c) => c.zIndex)) + 1,
    };
    commit((doc) => ({ ...doc, components: [...doc.components, copy] }));
    setSelectedId(copy.id);
  }

  function moveComponentBy(id: string, dxMm: number, dyMm: number) {
    commit((doc) => ({
      ...doc,
      components: doc.components.map((c) => (c.id === id ? { ...c, x: c.x + dxMm, y: c.y + dyMm } : c)),
    }));
  }

  function resizeComponent(id: string, widthMm: number, heightMm: number) {
    commit((doc) => ({
      ...doc,
      components: doc.components.map((c) => (c.id === id ? { ...c, width: widthMm, height: heightMm } : c)),
    }));
  }

  function addComponentAt(type: ComponentType, xMm: number, yMm: number) {
    const zIndex = Math.max(0, ...document.components.map((c) => c.zIndex)) + 1;
    const component = createDefaultComponent(type, {
      id: crypto.randomUUID(),
      x: Math.max(0, xMm),
      y: Math.max(0, yMm),
      zIndex,
    });
    commit((doc) => ({ ...doc, components: [...doc.components, component] }));
    setSelectedId(component.id);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over, delta } = event;
    const data = active.data.current as
      | { source: "palette"; componentType: ComponentType }
      | { source: "canvas-item"; componentId: string }
      | undefined;
    if (!data) return;
    const effectiveScale = CSS_PX_PER_MM * zoom;

    if (data.source === "palette") {
      if (!over || over.id !== "canvas") return;
      const canvasRect = over.rect;
      const activeRect = active.rect.current.translated;
      if (!activeRect) return;
      const xMm = (activeRect.left - canvasRect.left) / effectiveScale;
      const yMm = (activeRect.top - canvasRect.top) / effectiveScale;
      addComponentAt(data.componentType, xMm, yMm);
    } else if (data.source === "canvas-item") {
      moveComponentBy(data.componentId, delta.x / effectiveScale, delta.y / effectiveScale);
    }
  }

  async function save() {
    setSaveState("saving");
    const res = await fetch(`/api/v1/templates/${templateId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: document }),
    });
    if (!res.ok) {
      setSaveState("error");
      return;
    }
    const saved = await res.json();
    setVersionNumber(saved.versionNumber);
    setSaveState("saved");
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Link href="/templates" className="mr-2 text-xs text-zinc-500 hover:underline dark:text-zinc-400">
            ← Templates
          </Link>
          <button type="button" onClick={undo} disabled={past.length === 0} className="rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700">
            Undo
          </button>
          <button type="button" onClick={redo} disabled={future.length === 0} className="rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700">
            Redo
          </button>
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          >
            {ZOOM_LEVELS.map((z) => (
              <option key={z} value={z}>
                {Math.round(z * 100)}%
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPreviewMode((p) => !p)}
            className={`rounded-md border px-2 py-1 text-xs ${previewMode ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900" : "border-zinc-300 dark:border-zinc-700"}`}
          >
            Preview
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>v{versionNumber}</span>
          {saveState === "saved" && <span className="text-green-600">Saved</span>}
          {saveState === "error" && <span className="text-red-600">Save failed</span>}
          <button
            type="button"
            onClick={save}
            disabled={saveState === "saving"}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {saveState === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="flex-1 overflow-auto bg-zinc-100 p-8 dark:bg-zinc-950">
          <div className="mx-auto shadow-lg" style={{ width: "210mm" }}>
            <TemplateRenderer document={document} />
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex flex-1 overflow-hidden">
            <Palette />
            <Canvas
              document={document}
              zoom={zoom}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveBy={moveComponentBy}
              onResize={resizeComponent}
            />
            <PropertiesPanel
              component={selectedComponent()}
              onChange={updateComponent}
              onDelete={deleteComponent}
              onDuplicate={duplicateComponent}
            />
          </div>
        </DndContext>
      )}
    </div>
  );
}
