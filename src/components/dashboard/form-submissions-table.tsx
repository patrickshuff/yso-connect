import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SubmissionRow } from "@/app/dashboard/[orgId]/forms/actions";

interface FormSubmissionsTableProps {
  submissions: SubmissionRow[];
}

export function FormSubmissionsTable({ submissions }: FormSubmissionsTableProps) {
  if (submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No submissions yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Guardian</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Signature</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.playerName}</TableCell>
            <TableCell>{s.guardianName}</TableCell>
            <TableCell>
              <Badge variant={s.status === "completed" ? "default" : "secondary"}>
                {s.status === "completed" ? "Completed" : "Pending"}
              </Badge>
            </TableCell>
            <TableCell>{s.signatureName ?? "--"}</TableCell>
            <TableCell>
              {s.completedAt
                ? new Date(s.completedAt).toLocaleDateString()
                : "--"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
