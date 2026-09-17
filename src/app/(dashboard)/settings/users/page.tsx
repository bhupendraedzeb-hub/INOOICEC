import { auth } from "@/lib/auth/auth";
import { listOrgUsers } from "@/lib/services/users";
import { UserForm } from "@/components/settings/UserForm";
import { UserList } from "@/components/settings/UserList";

export default async function UsersPage() {
  const session = await auth();
  const canManage = session?.user.role === "OWNER" || session?.user.role === "ADMIN";
  const users = await listOrgUsers(session!.user.organizationId);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Team Members</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Everyone here belongs to your organization only — there&apos;s no cross-organization access.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <UserList
          users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
          currentUserId={session!.user.id}
          canManage={canManage}
        />
        {canManage && <UserForm />}
      </div>
    </div>
  );
}
