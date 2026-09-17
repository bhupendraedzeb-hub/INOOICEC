"use client";

import type {
  ComponentNode,
  ItemsTableColumnKey,
  ItemsTableProps,
  QrCodeProps,
  ShapeProps,
  TextProps,
  ImageProps,
  DividerProps,
  BaseStyle,
} from "@/types/template";
import { COMPONENT_LABELS } from "@/components/builder/componentDefaults";
import { FieldPicker } from "@/components/builder/FieldPicker";
import { CATEGORIES_BY_DOCUMENT_KIND } from "@/lib/render/fieldRegistry";

type Props = {
  component: ComponentNode | null;
  onChange: (updated: ComponentNode) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  documentKind?: "invoice" | "receipt";
};

const ALL_COLUMN_KEYS: Array<{ key: ItemsTableColumnKey; label: string }> = [
  { key: "index", label: "#" },
  { key: "item", label: "Item" },
  { key: "description", label: "Description" },
  { key: "hsn", label: "HSN/SAC" },
  { key: "qty", label: "Quantity" },
  { key: "unit", label: "Unit" },
  { key: "rate", label: "Rate" },
  { key: "discount", label: "Discount" },
  { key: "gstPercent", label: "GST %" },
  { key: "taxAmount", label: "Tax Amount" },
  { key: "amount", label: "Amount" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900";

export function PropertiesPanel({ component, onChange, onDelete, onDuplicate, documentKind = "invoice" }: Props) {
  if (!component) {
    return (
      <div className="w-64 flex-shrink-0 border-l border-zinc-200 p-3 text-xs text-zinc-400 dark:border-zinc-800">
        Select a component to edit its properties.
      </div>
    );
  }

  const c = component;
  const style = c.props as Partial<BaseStyle>;
  const fieldCategories = CATEGORIES_BY_DOCUMENT_KIND[documentKind];

  function update(patch: Partial<ComponentNode>) {
    onChange({ ...c, ...patch });
  }
  function updateProps<T extends object>(patch: Partial<T>) {
    onChange({ ...c, props: { ...c.props, ...patch } } as ComponentNode);
  }

  return (
    <div className="flex w-64 flex-shrink-0 flex-col gap-4 overflow-y-auto border-l border-zinc-200 p-3 dark:border-zinc-800">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{COMPONENT_LABELS[c.type]}</h3>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onDuplicate(c.id)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => onDelete(c.id)}
            className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-400"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="X (mm)">
          <input type="number" className={inputCls} value={c.x} onChange={(e) => update({ x: Number(e.target.value) })} />
        </Field>
        <Field label="Y (mm)">
          <input type="number" className={inputCls} value={c.y} onChange={(e) => update({ y: Number(e.target.value) })} />
        </Field>
        <Field label="Width (mm)">
          <input type="number" className={inputCls} value={c.width} onChange={(e) => update({ width: Number(e.target.value) })} />
        </Field>
        <Field label="Height (mm)">
          <input type="number" className={inputCls} value={c.height} onChange={(e) => update({ height: Number(e.target.value) })} />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={c.locked} onChange={(e) => update({ locked: e.target.checked })} />
          Locked
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={c.visible} onChange={(e) => update({ visible: e.target.checked })} />
          Visible
        </label>
      </div>

      {c.type === "text" && (
        <Field label="Text content">
          <div className="flex flex-col gap-1.5">
            {(c.props as TextProps).content.map((run, i) => {
              const content = (c.props as TextProps).content;
              return (
                <div key={i} className="flex items-center gap-1">
                  {typeof run === "string" ? (
                    <input
                      className={`${inputCls} flex-1`}
                      value={run}
                      onChange={(e) => {
                        const next = [...content];
                        next[i] = e.target.value;
                        updateProps<TextProps>({ content: next });
                      }}
                    />
                  ) : (
                    <span className="flex-1 truncate rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {`{{${run.path}}}`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => updateProps<TextProps>({ content: content.filter((_, idx) => idx !== i) })}
                    className="text-xs text-red-600 dark:text-red-400"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateProps<TextProps>({ content: [...(c.props as TextProps).content, ""] })
                }
                className="text-xs text-zinc-600 underline dark:text-zinc-400"
              >
                + Add text
              </button>
              <FieldPicker
                allowedTypes={["text", "date", "currency"]}
                categories={fieldCategories}
                onSelect={(path) =>
                  updateProps<TextProps>({
                    content: [...(c.props as TextProps).content, { kind: "field", path }],
                  })
                }
              />
            </div>
          </div>
        </Field>
      )}

      {c.type === "image" && (
        <>
          <Field label="Image source">
            {typeof (c.props as ImageProps).src === "object" ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {`{{${((c.props as ImageProps).src as { path: string }).path}}}`}
                </span>
                <button
                  type="button"
                  onClick={() => updateProps<ImageProps>({ src: "" })}
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  Clear
                </button>
              </div>
            ) : (
              <input
                className={inputCls}
                placeholder="https://…"
                value={(c.props as ImageProps).src as string}
                onChange={(e) => updateProps<ImageProps>({ src: e.target.value })}
              />
            )}
          </Field>
          <FieldPicker
            allowedTypes={["image"]}
            categories={fieldCategories}
            onSelect={(path) => updateProps<ImageProps>({ src: { kind: "field", path } })}
          />
          <Field label="Fit">
            <select
              className={inputCls}
              value={(c.props as ImageProps).fit ?? "contain"}
              onChange={(e) => updateProps<ImageProps>({ fit: e.target.value as "contain" | "cover" })}
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
            </select>
          </Field>
        </>
      )}

      {c.type === "divider" && (
        <>
          <Field label="Color">
            <input
              type="color"
              className={inputCls}
              value={(c.props as DividerProps).color ?? "#d4d4d8"}
              onChange={(e) => updateProps<DividerProps>({ color: e.target.value })}
            />
          </Field>
          <Field label="Thickness (px)">
            <input
              type="number"
              className={inputCls}
              value={(c.props as DividerProps).thickness ?? 1}
              onChange={(e) => updateProps<DividerProps>({ thickness: Number(e.target.value) })}
            />
          </Field>
        </>
      )}

      {c.type === "shape" && (
        <Field label="Shape">
          <select
            className={inputCls}
            value={(c.props as ShapeProps).shape}
            onChange={(e) => updateProps<ShapeProps>({ shape: e.target.value as ShapeProps["shape"] })}
          >
            <option value="rect">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="line">Line</option>
          </select>
        </Field>
      )}

      {c.type === "qrcode" && (
        <>
          <Field label="Source">
            {typeof (c.props as QrCodeProps).source === "object" ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {`{{${((c.props as QrCodeProps).source as { field: { path: string } }).field.path}}}`}
                </span>
                <button
                  type="button"
                  onClick={() => updateProps<QrCodeProps>({ source: "upi" })}
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  Clear
                </button>
              </div>
            ) : (
              <select
                className={inputCls}
                value={(c.props as QrCodeProps).source as "upi" | "customUrl"}
                onChange={(e) => updateProps<QrCodeProps>({ source: e.target.value as "upi" | "customUrl" })}
              >
                <option value="upi">Company UPI</option>
                <option value="customUrl">Custom URL</option>
              </select>
            )}
          </Field>
          <FieldPicker
            allowedTypes={["text"]}
            categories={fieldCategories}
            onSelect={(path) => updateProps<QrCodeProps>({ source: { field: { kind: "field", path } } })}
          />
        </>
      )}

      {c.type === "itemsTable" && (() => {
        const cols = (c.props as ItemsTableProps).columns;
        const availableToAdd = ALL_COLUMN_KEYS.filter(({ key }) => !cols.some((col) => col.key === key));

        function setColumns(next: typeof cols) {
          updateProps<ItemsTableProps>({ columns: next });
        }
        function moveColumn(index: number, dir: -1 | 1) {
          const target = index + dir;
          if (target < 0 || target >= cols.length) return;
          const next = [...cols];
          [next[index], next[target]] = [next[target], next[index]];
          setColumns(next);
        }

        return (
          <div className="flex flex-col gap-2">
            <Field label="Columns (order = left to right)">
              <div className="flex flex-col gap-1.5">
                {cols.map((col, i) => (
                  <div key={col.key} className="flex items-center gap-1 rounded border border-zinc-200 p-1.5 dark:border-zinc-800">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveColumn(i, -1)}
                        className="text-[10px] leading-none text-zinc-500 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={i === cols.length - 1}
                        onClick={() => moveColumn(i, 1)}
                        className="text-[10px] leading-none text-zinc-500 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="w-20 flex-shrink-0 truncate text-xs text-zinc-700 dark:text-zinc-300">
                      {col.label}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={col.widthPercent}
                      onChange={(e) => {
                        const next = [...cols];
                        next[i] = { ...col, widthPercent: Number(e.target.value) || 1 };
                        setColumns(next);
                      }}
                      title="Width %"
                      className={`${inputCls} w-14`}
                    />
                    <select
                      value={col.align ?? "left"}
                      onChange={(e) => {
                        const next = [...cols];
                        next[i] = { ...col, align: e.target.value as "left" | "center" | "right" };
                        setColumns(next);
                      }}
                      className={`${inputCls} flex-1`}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setColumns(cols.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-600 dark:text-red-400"
                      aria-label="Remove column"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </Field>
            {availableToAdd.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const def = availableToAdd.find((a) => a.key === e.target.value);
                  if (def) setColumns([...cols, { key: def.key, label: def.label, widthPercent: 10, align: "left" }]);
                }}
                className={inputCls}
              >
                <option value="">+ Add column…</option>
                {availableToAdd.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={(c.props as ItemsTableProps).repeatHeaderOnEachPage}
                onChange={(e) => updateProps<ItemsTableProps>({ repeatHeaderOnEachPage: e.target.checked })}
              />
              Repeat header on each page
            </label>
          </div>
        );
      })()}

      {!["image", "logo", "divider"].includes(c.type) && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Style</h4>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Font size">
              <input
                type="number"
                className={inputCls}
                value={style.fontSize ?? ""}
                onChange={(e) => updateProps<BaseStyle>({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
              />
            </Field>
            <Field label="Weight">
              <select
                className={inputCls}
                value={style.fontWeight ?? "normal"}
                onChange={(e) => updateProps<BaseStyle>({ fontWeight: e.target.value as "normal" | "bold" })}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </Field>
            <Field label="Align">
              <select
                className={inputCls}
                value={style.align ?? "left"}
                onChange={(e) => updateProps<BaseStyle>({ align: e.target.value as "left" | "center" | "right" })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </Field>
            <Field label="Color">
              <input
                type="color"
                className={inputCls}
                value={style.color ?? "#000000"}
                onChange={(e) => updateProps<BaseStyle>({ color: e.target.value })}
              />
            </Field>
            <Field label="Background">
              <input
                type="color"
                className={inputCls}
                value={style.background ?? "#ffffff"}
                onChange={(e) => updateProps<BaseStyle>({ background: e.target.value })}
              />
            </Field>
            <Field label="Padding (mm)">
              <input
                type="number"
                className={inputCls}
                value={style.paddingMm ?? ""}
                onChange={(e) => updateProps<BaseStyle>({ paddingMm: e.target.value ? Number(e.target.value) : undefined })}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
