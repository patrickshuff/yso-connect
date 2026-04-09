import Link from "next/link";
import { Button } from "@/components/ui/button";

interface OrgHeaderProps {
  orgName: string;
  slug: string;
}

export function OrgHeader({ orgName, slug }: OrgHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/o/${slug}`} className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-4 text-primary-foreground"
              aria-hidden="true"
            >
              <path
                d="M12 3L4 9v6l8 6 8-6V9l-8-6z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              <path
                d="M12 6v3.5M12 14.5V18M7.5 9.5l3 1.5M13.5 13l3 1.5M7.5 14.5l3-1.5M13.5 11l3-1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            {orgName}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href={`/o/${slug}/schedule`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Schedule
          </Link>
          <div className="ml-3">
            <Button render={<Link href={`/o/${slug}/signup`} />} size="sm">
              Join Us
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
