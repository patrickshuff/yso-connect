import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AssignFormDialog } from "@/components/dashboard/assign-form-dialog";
import { FormAssignmentsTable } from "@/components/dashboard/form-assignments-table";
import { FormSubmissionsTable } from "@/components/dashboard/form-submissions-table";
import {
  getFormDetail,
  getFormAssignments,
  getFormSubmissions,
  getOrgTeams,
  getOrgPlayers,
} from "../actions";

const TYPE_LABELS: Record<string, string> = {
  waiver: "Waiver",
  medical: "Medical",
  permission: "Permission",
  registration: "Registration",
  custom: "Custom",
};

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; formId: string }>;
}) {
  const { orgId, formId } = await params;

  const [form, assignments, submissions, orgTeams, orgPlayers] = await Promise.all([
    getFormDetail(orgId, formId),
    getFormAssignments(formId),
    getFormSubmissions(formId),
    getOrgTeams(orgId),
    getOrgPlayers(orgId),
  ]);

  if (!form) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href={`/dashboard/${orgId}/forms`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Back to Forms
          </Link>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {form.title}
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{TYPE_LABELS[form.formType] ?? form.formType}</Badge>
            <Badge variant={form.isActive ? "default" : "secondary"}>
              {form.isActive ? "Active" : "Inactive"}
            </Badge>
            {form.requiresSignature && (
              <Badge variant="secondary">Signature Required</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/${orgId}/forms/${formId}/submit`}>
            <Button variant="outline">Preview / Submit</Button>
          </Link>
          <AssignFormDialog
            orgId={orgId}
            formId={formId}
            teams={orgTeams}
            players={orgPlayers}
          />
        </div>
      </div>

      {/* Form content preview */}
      {form.description && (
        <p className="text-sm text-muted-foreground">{form.description}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Form Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {form.content}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Assignments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Assignments
        </h3>
        <FormAssignmentsTable assignments={assignments} />
      </div>

      <Separator />

      {/* Submissions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Submissions ({submissions.length})
        </h3>
        <FormSubmissionsTable submissions={submissions} />
      </div>
    </div>
  );
}
