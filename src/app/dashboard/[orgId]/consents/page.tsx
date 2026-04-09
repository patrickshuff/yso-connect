import { eq, desc } from "drizzle-orm";
import { Phone, ShieldCheck, ShieldOff } from "lucide-react";
import { db } from "@/db";
import { smsConsents } from "@/db/schema";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getConsents(orgId: string) {
  return db
    .select()
    .from(smsConsents)
    .where(eq(smsConsents.organizationId, orgId))
    .orderBy(desc(smsConsents.consentedAt));
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

export default async function ConsentsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const consents = await getConsents(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          SMS Consents
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage SMS consent records for TCPA compliance.
        </p>
      </div>

      {consents.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <ShieldCheck className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No SMS consents recorded yet. Share your consent page link with
                parents to start collecting opt-ins.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Guardian Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Consented At
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Method
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {consents.map((consent) => {
                const isRevoked = consent.revokedAt !== null;
                return (
                  <tr
                    key={consent.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Phone className="size-3.5 text-muted-foreground" />
                        {consent.phoneNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {consent.guardianName ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(consent.consentedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {consent.consentMethod.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {isRevoked ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <ShieldOff className="mr-1 size-3" />
                          Revoked
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <ShieldCheck className="mr-1 size-3" />
                          Active
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
