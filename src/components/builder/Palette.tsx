"use client";

import { useDraggable } from "@dnd-kit/core";
import type { ComponentType } from "@/types/template";
import { PALETTE_GROUPS_BY_KIND, COMPONENT_LABELS } from "@/components/builder/componentDefaults";

function PaletteItem({ type }: { type: ComponentType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: "palette", componentType: type },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-left text-xs text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
      style={{ opacity: isDragging ? 0.4 : 1, cursor: "grab" }}
    >
      {COMPONENT_LABELS[type]}
    </button>
  );
}

export function Palette({ documentKind = "invoice" }: { documentKind?: "invoice" | "receipt" }) {
  return (
    <div className="flex w-48 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-400">Drag a component onto the canvas</p>
      {PALETTE_GROUPS_BY_KIND[documentKind].map((group) => (
        <div key={group.title} className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{group.title}</h3>
          {group.types.map((type) => (
            <PaletteItem key={type} type={type} />
          ))}
        </div>
      ))}
    </div>
  );
}
