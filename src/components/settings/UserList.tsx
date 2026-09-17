"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export function UserList({ users, currentUserId, canManage }: { users: UserRow[]; currentUserId: string; canManage: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deactivate(id: string) {
    if (!confirm("Deactivate this user? They will immediately lose access.")) return;
    setBusyId(id);
    const res = await fetch(`/api/v1/users/${id}/deactivate`, { method: "POST" });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  if (users.length === 0) {
    return <p className="text-sm text-zinc-400">No team members yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-1.5 font-medium">Name</th>
          <th className="py-1.5 font-medium">Email</th>
          <th className="py-1.5 font-medium">Role</th>
          <th className="py-1.5 font-medium">Status</th>
          {canManage && <th className="py-1.5 font-medium" />}
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-1.5 text-zinc-900 dark:text-zinc-50">
              {u.name}
              {u.id === currentUserId && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
            </td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{u.email}</td>
            <td className="py-1.5 text-xs text-zinc-600 dark:text-zinc-400">{u.role}</td>
            <td className="py-1.5">
              {u.isActive ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                  Deactivated
                </span>
              )}
            </td>
            {canManage && (
              <td className="py-1.5">
                {u.isActive && u.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => deactivate(u.id)}
                    disabled={busyId === u.id}
                    className="text-xs text-red-600 disabled:opacity-50 dark:text-red-400"
                  >
                    Deactivate
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
