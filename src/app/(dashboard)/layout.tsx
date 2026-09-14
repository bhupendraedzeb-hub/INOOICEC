import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <nav className="flex items-center gap-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Link href="/dashboard" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Dashboard
          </Link>
          <Link href="/templates" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Templates
          </Link>
          <Link href="/customers" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Customers
          </Link>
          <Link href="/products" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Products
          </Link>
          <Link href="/settings/company" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Company Settings
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            {session.user.name ?? session.user.email} ({session.user.role})
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="hover:text-zinc-950 dark:hover:text-zinc-50">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
