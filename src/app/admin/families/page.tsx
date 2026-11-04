import { createAdminClient } from "@/lib/supabase/admin";
import { accessFor, type SubscriptionRow } from "@/lib/entitlement";
import { serverEnv } from "@/lib/env";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Families" };

const STATE_LABEL = { none: "No plan", trial: "Trial", active: "Paying", past_due: "Payment failed", grace: "Grace period", ended: "Ended" };

export default async function FamiliesPage({ searchParams }: PageProps<"/admin/families">) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = 50;
  const admin = createAdminClient();

  const { data: usersPage } = await admin.auth.admin.listUsers({ page, perPage });
  const users = usersPage?.users ?? [];
  const ids = users.map((u) => u.id);
  const [{ data: profiles }, { data: children }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("id,role,created_at").in("id", ids),
    admin.from("children").select("parent_id").in("parent_id", ids),
    admin.from("subscriptions").select("*").in("parent_id", ids).neq("status", "created").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Families</h1>
      <p className="hint">We only store each child&apos;s nickname, avatar and age range, so that&apos;s all you&apos;ll find here.</p>
      <div className="overflow-x-auto rounded-lg border-[3px] border-ink bg-paper">
        <table className="w-full text-left">
          <thead className="border-b-2 border-ink bg-tone">
            <tr>
              <th className="p-3">Parent email</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Readers</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const profile = profiles?.find((p) => p.id === u.id);
              const sub = (subs?.find((s) => s.parent_id === u.id) as SubscriptionRow | undefined) ?? null;
              const access = accessFor(sub, serverEnv.graceDays());
              return (
                <tr key={u.id} className="border-b border-tone-deep last:border-0">
                  <td className="p-3">
                    {u.email} {profile?.role === "admin" ? <span className="tag ml-1">admin</span> : null}
                  </td>
                  <td className="p-3">{formatDate(profile?.created_at ?? u.created_at)}</td>
                  <td className="p-3">{children?.filter((c) => c.parent_id === u.id).length ?? 0}</td>
                  <td className="p-3">{sub ? (sub.plan === "annual" ? "Yearly" : "Monthly") : "—"}</td>
                  <td className="p-3"><span className="tag">{STATE_LABEL[access.state]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <nav className="flex gap-3">
        {page > 1 ? <a className="btn" href={`/admin/families?page=${page - 1}`}>Previous</a> : null}
        {users.length === perPage ? <a className="btn" href={`/admin/families?page=${page + 1}`}>Next</a> : null}
      </nav>
    </div>
  );
}
