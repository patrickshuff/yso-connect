import Link from "next/link";
import { FileText } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditFormDialog } from "@/components/dashboard/edit-form-dialog";
import { DeleteFormDialog } from "@/components/dashboard/delete-form-dialog";
import type { FormWithStats } from "@/app/dashboard/[orgId]/forms/actions";

interface FormsListProps {
  orgId: string;
  forms: FormWithStats[];
  isAdmin?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  waiver: "Waiver",
  medical: "Medical",
  permission: "Permission",
  registration: "Registration",
  custom: "Custom",
};

export function FormsList({ orgId, forms, isAdmin }: FormsListProps) {
  if (forms.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-12">
            <FileText className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No forms yet. Create your first form to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {forms.map((form) => (
        <Card key={form.id} className="transition-colors hover:border-primary/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <Link
                href={`/dashboard/${orgId}/forms/${form.id}`}
                className="min-w-0 flex-1"
              >
                <CardTitle className="line-clamp-1">{form.title}</CardTitle>
              </Link>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <Badge variant={form.isActive ? "default" : "secondary"}>
                  {form.isActive ? "Active" : "Inactive"}
                </Badge>
                {isAdmin && (
                  <>
                    <EditFormDialog orgId={orgId} form={form} />
                    <DeleteFormDialog
                      orgId={orgId}
                      formId={form.id}
                      formTitle={form.title}
                    />
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <Link
            href={`/dashboard/${orgId}/forms/${form.id}`}
            className="block"
          >
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{TYPE_LABELS[form.formType] ?? form.formType}</Badge>
                {form.requiresSignature && (
                  <Badge variant="secondary">Signature Required</Badge>
                )}
              </div>
              {form.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {form.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {form.totalCompleted} of {form.totalAssigned} completed
              </p>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}
