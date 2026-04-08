import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <div className="space-y-3">
          {messageRows.map((msg) => (
            <Card key={msg.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {msg.subject ?? "(No subject)"}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary">
                        {msg.targetType === "team" && msg.teamName
                          ? msg.teamName
                          : "Entire Organization"}
                      </Badge>
                      <Badge variant="outline">{channelLabel(msg.channel)}</Badge>
                    </CardDescription>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(msg.sentAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {msg.body}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{msg.totalDeliveries} deliveries</span>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
