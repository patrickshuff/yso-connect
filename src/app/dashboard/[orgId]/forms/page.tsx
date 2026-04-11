import { auth } from "@clerk/nextjs/server";
import { getFormsWithStats } from "./actions";
import { getMembership } from "@/lib/memberships";
import { CreateFormDialog } from "@/components/dashboard/create-form-dialog";
import { FormsList } from "@/components/dashboard/forms-list";

export default async function FormsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [formRows, membership] = await Promise.all([
    getFormsWithStats(orgId),
    getMembership(orgId, userId),
  ]);

  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Forms &amp; Waivers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage forms, waivers, and permission slips.
          </p>
        </div>
        {isAdmin && <CreateFormDialog orgId={orgId} />}
      </div>

      <FormsList orgId={orgId} forms={formRows} isAdmin={isAdmin} />
    </div>
  );
}
