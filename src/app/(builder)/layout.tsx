import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

// Separate from (dashboard): the template builder is a full-bleed editor and
// shouldn't share the standard padded header+main chrome used by list/detail
// pages. Still auth-guarded the same way.
export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <div className="min-h-screen">{children}</div>;
}
