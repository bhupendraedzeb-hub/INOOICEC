"use client";

import type { InvoiceItemInput } from "@/lib/validation/schemas/invoice";

export type ProductOption = {
  id: string;
  name: string;
  hsnSac: string | null;
  defaultRate: string;
  gstRate: string;
  unit: string | null;
};

const EMPTY_ITEM: InvoiceItemInput = {
  productId: null,
  description: "",
  hsnSac: null,
  quantity: "1",
  unit: null,
  rate: "0.00",
  discount: "0.00",
  gstRate: "0.00",
};

const inputCls = "w-full rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900";

export function InvoiceItemsEditor({
  items,
  onChange,
  products,
}: {
  items: InvoiceItemInput[];
  onChange: (items: InvoiceItemInput[]) => void;
  products: ProductOption[];
}) {
  function updateItem(index: number, patch: Partial<InvoiceItemInput>) {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function applyProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      updateItem(index, { productId: null });
      return;
    }
    updateItem(index, {
      productId: product.id,
      description: items[index].description || product.name,
      hsnSac: product.hsnSac,
      rate: product.defaultRate,
      gstRate: product.gstRate,
      unit: product.unit,
    });
  }

  function addItem() {
    onChange([...items, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-1 pr-2 font-medium">Product</th>
              <th className="py-1 pr-2 font-medium">Description</th>
              <th className="py-1 pr-2 font-medium">HSN/SAC</th>
              <th className="w-16 py-1 pr-2 font-medium">Qty</th>
              <th className="w-16 py-1 pr-2 font-medium">Unit</th>
              <th className="w-24 py-1 pr-2 font-medium">Rate</th>
              <th className="w-24 py-1 pr-2 font-medium">Discount</th>
              <th className="w-20 py-1 pr-2 font-medium">GST %</th>
              <th className="w-8 py-1" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-1 pr-2">
                  <select
                    className={inputCls}
                    value={item.productId ?? ""}
                    onChange={(e) => applyProduct(i, e.target.value)}
                  >
                    <option value="">—</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <input
                    className={inputCls}
                    value={item.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    placeholder="Item description"
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className={inputCls}
                    value={item.hsnSac ?? ""}
                    onChange={(e) => updateItem(i, { hsnSac: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className={inputCls}
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className={inputCls}
                    value={item.unit ?? ""}
                    onChange={(e) => updateItem(i, { unit: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className={inputCls}
                    value={item.rate}
                    onChange={(e) => updateItem(i, { rate: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className={inputCls}
                    value={item.discount ?? ""}
                    onChange={(e) => updateItem(i, { discount: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    className={inputCls}
                    value={item.gstRate}
                    onChange={(e) => updateItem(i, { gstRate: e.target.value })}
                  />
                </td>
                <td className="py-1">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-red-600 dark:text-red-400"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="self-start rounded-md border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700"
      >
        + Add item
      </button>
    </div>
  );
}
