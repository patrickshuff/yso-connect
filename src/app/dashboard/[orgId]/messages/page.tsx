import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getMessages } from "./actions";

function formatDate(date: Date | null): string {
  if (!date) return "Not sent";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function channelLabel(channel: string): string {
  switch (channel) {
    case "sms":
      return "SMS";
    case "email":
      return "Email";
    case "both":
      return "SMS + Email";
    default:
      return channel;
  }
}

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const messageRows = await getMessages(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Messages
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send and track messages to guardians.
          </p>
        </div>
        <Button render={<Link href={`/dashboard/${orgId}/messages/compose`} />}>
          <Plus className="size-4" data-icon="inline-start" />
          New Message
        </Button>
      </div>

      {messageRows.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <MessageSquare className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No messages sent yet. Compose your first message to get started.
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
                  <TableHead>Subject</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Deliveries</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageRows.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-medium">
                      <div>{msg.subject ?? "(No subject)"}</div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {msg.body}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {msg.targetType === "team" && msg.teamName
                          ? msg.teamName
                          : "Entire Organization"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{channelLabel(msg.channel)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs">
                        <span>{msg.totalDeliveries} total</span>
                        {msg.sentDeliveries > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            {msg.sentDeliveries} sent
                          </span>
                        )}
                        {msg.failedDeliveries > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {msg.failedDeliveries} failed
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(msg.sentAt)}
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
