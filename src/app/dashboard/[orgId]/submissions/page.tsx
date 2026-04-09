import { eq, desc } from "drizzle-orm";
import { Inbox, Mail, Phone, User } from "lucide-react";
import { db } from "@/db";
import { interestSubmissions } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    hour: "numeric",
    minute: "2-digit",
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
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="size-4" />
                      {submission.parentName}
                      <Badge className={STATUS_STYLES[submission.status] ?? ""}>
                        {submission.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-3">
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
                          className="flex items-center gap-1 hover:underline"
                        >
                          <Phone className="size-3.5" />
                          {submission.parentPhone}
                        </a>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(submission.createdAt)}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid gap-4 text-sm sm:grid-cols-3">
                    {submission.childName && (
                      <div>
                        <p className="font-medium text-muted-foreground">
                          Child
                        </p>
                        <p className="text-foreground">
                          {submission.childName}
                          {submission.childAge
                            ? ` (age ${submission.childAge})`
                            : ""}
                        </p>
                      </div>
                    )}
                    {submission.sportInterest && (
                      <div>
                        <p className="font-medium text-muted-foreground">
                          Sport Interest
                        </p>
                        <p className="text-foreground">
                          {submission.sportInterest}
                        </p>
                      </div>
                    )}
                  </div>
                  {submission.message && (
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">
                        Message
                      </p>
                      <p className="mt-1 text-foreground">
                        {submission.message}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {submission.status !== "contacted" && (
                      <SubmissionStatusButton
                        submissionId={submission.id}
                        orgId={orgId}
                        targetStatus="contacted"
                        label="Mark Contacted"
                      />
                    )}
                    {submission.status !== "enrolled" && (
                      <SubmissionStatusButton
                        submissionId={submission.id}
                        orgId={orgId}
                        targetStatus="enrolled"
                        label="Mark Enrolled"
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
