import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completion</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow key={form.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/${orgId}/forms/${form.id}`}
                    className="hover:underline underline-offset-2"
                  >
                    {form.title}
                  </Link>
                  {form.description && (
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {form.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline">
                      {TYPE_LABELS[form.formType] ?? form.formType}
                    </Badge>
                    {form.requiresSignature && (
                      <Badge variant="secondary">Signature</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={form.isActive ? "default" : "secondary"}>
                    {form.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {form.totalCompleted} of {form.totalAssigned} completed
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditFormDialog orgId={orgId} form={form} />
                      <DeleteFormDialog
                        orgId={orgId}
                        formId={form.id}
                        formTitle={form.title}
                      />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
