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

export default function InvalidInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Invalid invite link</CardTitle>
          <CardDescription>
            This invite link is not valid. It may have already been used or the
            link may be incorrect.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Contact your team administrator to request a new invite.
          </p>
          <Link href="/sign-in" className={cn(buttonVariants(), "w-full")}>
            Sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
