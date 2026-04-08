import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FormAssignmentRow } from "@/app/dashboard/[orgId]/forms/actions";

interface FormAssignmentsTableProps {
  assignments: FormAssignmentRow[];
}

export function FormAssignmentsTable({ assignments }: FormAssignmentsTableProps) {
  if (assignments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No assignments yet. Assign this form to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Target</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">{a.targetName}</TableCell>
            <TableCell>
              <Badge variant="outline">{a.assignmentType}</Badge>
            </TableCell>
            <TableCell>{a.dueDate ?? "No due date"}</TableCell>
            <TableCell>{a.createdAt.toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
