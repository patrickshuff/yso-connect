import { eq, desc } from "drizzle-orm";
import { Inbox, Mail, Phone } from "lucide-react";
import { db } from "@/db";
import { interestSubmissions } from "@/db/schema";
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
import { SubmissionStatusButton } from "@/components/dashboard/submission-status-button";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contacted:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  enrolled:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  declined: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

async function getSubmissions(orgId: string) {
  return db
    .select()
    .from(interestSubmissions)
    .where(eq(interestSubmissions.organizationId, orgId))
    .orderBy(desc(interestSubmissions.createdAt));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const submissions = await getSubmissions(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Interest Submissions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review interest form submissions from families looking to join your
          organization.
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <Inbox className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No submissions yet. Share your public page to start receiving
                interest forms.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Child</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      {submission.parentName}
                      {submission.message && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {submission.message}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <a
                        href={`mailto:${submission.parentEmail}`}
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Mail className="size-3.5" />
                        {submission.parentEmail}
                      </a>
                      {submission.parentPhone && (
                        <a
                          href={`tel:${submission.parentPhone}`}
                          className="mt-0.5 flex items-center gap-1 text-xs hover:underline"
                        >
                          <Phone className="size-3" />
                          {submission.parentPhone}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {submission.childName ? (
                        <>
                          {submission.childName}
                          {submission.childAge
                            ? ` (age ${submission.childAge})`
                            : ""}
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {submission.sportInterest ?? <span>—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[submission.status] ?? ""}>
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(submission.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {submission.status !== "contacted" && (
                          <SubmissionStatusButton
                            submissionId={submission.id}
                            orgId={orgId}
                            targetStatus="contacted"
                            label="Contacted"
                          />
                        )}
                        {submission.status !== "enrolled" && (
                          <SubmissionStatusButton
                            submissionId={submission.id}
                            orgId={orgId}
                            targetStatus="enrolled"
                            label="Enrolled"
                          />
                        )}
                        {submission.status !== "declined" && (
                          <SubmissionStatusButton
                            submissionId={submission.id}
                            orgId={orgId}
                            targetStatus="declined"
                            label="Decline"
                            variant="ghost"
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
