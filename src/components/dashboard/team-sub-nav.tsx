"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TeamSubNavProps {
  orgId: string;
  teamId: string;
}

export function TeamSubNav({ orgId, teamId }: TeamSubNavProps) {
  const pathname = usePathname();
  const base = `/dashboard/${orgId}/teams/${teamId}`;

  const items = [
    { label: "Overview", href: base, exact: true },
    { label: "Players", href: `${base}/players`, exact: false },
    { label: "Events", href: `${base}/events`, exact: false },
  ];

  return (
    <nav className="flex gap-1 border-b border-border">
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
