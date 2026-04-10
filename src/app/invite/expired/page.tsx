import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ExpiredInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Invite link expired</CardTitle>
          <CardDescription>
            This invite link is more than 7 days old and is no longer valid.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Contact your team administrator to request a new invite link.
          </p>
          <Link href="/sign-in" className={cn(buttonVariants(), "w-full")}>
            Sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
