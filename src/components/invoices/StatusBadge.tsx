const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  ISSUED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  UNPAID: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function Badge({ label }: { label: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[label] ?? ""}`}>{label.replace("_", " ")}</span>
  );
}
