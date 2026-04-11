import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FormSubmitForm } from "@/components/dashboard/form-submit-form";
import { getFormDetail, getGuardianAssignments } from "../../actions";

export default async function FormSubmitPage({
  params,
}: {
  params: Promise<{ orgId: string; formId: string }>;
}) {
  const { orgId, formId } = await params;
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const form = await getFormDetail(orgId, formId);
  if (!form) {
    notFound();
  }

  const guardianData = await getGuardianAssignments(orgId, formId, userId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/${orgId}/forms/${formId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to Form Details
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {form.title}
        </h2>
      </div>

      {!guardianData.guardian ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <p className="text-sm text-muted-foreground">
                No guardian profile found for your account in this organization. Please contact an administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <FormSubmitForm
          orgId={orgId}
          formId={formId}
          formTitle={form.title}
          formContent={form.content}
          requiresSignature={form.requiresSignature}
          guardianId={guardianData.guardian.id}
          guardianName={`${guardianData.guardian.firstName} ${guardianData.guardian.lastName}`}
          assignments={guardianData.assignments}
          playerOptions={guardianData.playerOptions}
        />
      )}
    </div>
  );
}
