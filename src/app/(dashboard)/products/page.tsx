import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { listProducts } from "@/lib/services/products";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; includeArchived?: string }>;
}) {
  const session = await auth();
  const { q, includeArchived } = await searchParams;
  const products = await listProducts(session!.user.organizationId, { q, includeArchived: includeArchived === "true" });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Products &amp; Services</h1>
        <Link
          href="/products/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Product
        </Link>
      </div>

      <form className="mt-4 flex items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, HSN/SAC…"
          className="w-80 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" name="includeArchived" value="true" defaultChecked={includeArchived === "true"} />
          Show archived
        </label>
        <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
          Search
        </button>
      </form>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">HSN/SAC</th>
            <th className="py-2 font-medium">Rate</th>
            <th className="py-2 font-medium">GST %</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">
                <Link href={`/products/${p.id}`} className="text-zinc-900 hover:underline dark:text-zinc-50">
                  {p.name}
                </Link>
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{p.hsnSac ?? "—"}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{p.defaultRate.toString()}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{p.gstRate.toString()}%</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{p.isArchived ? "Archived" : "Active"}</td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-zinc-400">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
