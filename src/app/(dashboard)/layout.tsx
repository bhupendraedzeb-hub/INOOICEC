import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth/auth";

const NAV_GROUPS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Overview",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/invoices", label: "Invoices" },
      { href: "/receipts", label: "Receipts" },
    ],
  },
  {
    title: "Templates",
    links: [
      { href: "/templates", label: "Templates" },
      { href: "/receipt-templates", label: "Receipt Templates" },
    ],
  },
  {
    title: "Directory",
    links: [
      { href: "/customers", label: "Customers" },
      { href: "/products", label: "Products" },
    ],
  },
  {
    title: "Settings",
    links: [
      { href: "/settings/company", label: "Company Settings" },
      { href: "/settings/users", label: "Team" },
      { href: "/settings/api-keys", label: "API Keys" },
      { href: "/settings/webhooks", label: "Webhooks" },
    ],
  },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen">
      <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <Link href="/dashboard" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Invoice Platform
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{group.title}</h3>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span className="truncate">
            {session.user.name ?? session.user.email} ({session.user.role})
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-left hover:text-zinc-950 dark:hover:text-zinc-50">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
    </div>
  );
}
