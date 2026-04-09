import Link from "next/link";

interface OrgFooterProps {
  orgName: string;
  slug: string;
}

export function OrgFooter({ orgName, slug }: OrgFooterProps) {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-3.5 text-primary-foreground"
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
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {orgName}
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href={`/o/${slug}/schedule`}
              className="transition-colors hover:text-foreground"
            >
              Schedule
            </Link>
            <Link
              href={`/o/${slug}/signup`}
              className="transition-colors hover:text-foreground"
            >
              Join Us
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground/70">
            Powered by{" "}
            <Link href="/" className="underline hover:text-foreground">
              YSO Connect
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
