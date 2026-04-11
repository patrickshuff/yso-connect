"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  Calendar,
  CalendarDays,
  CreditCard,
  FileText,
  Inbox,
  MessageSquare,
  Receipt,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  orgId: string;
}

const navItems = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Teams", href: "/teams", icon: Shield },
  { label: "Players", href: "/players", icon: Users },
  { label: "Guardians", href: "/guardians", icon: UserCheck },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Submissions", href: "/submissions", icon: Inbox },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Forms", href: "/forms", icon: FileText },
  { label: "Seasons", href: "/seasons", icon: Calendar },
  { label: "Billing", href: "/billing", icon: Receipt },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function SidebarNav({ orgId }: SidebarNavProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/${orgId}`;

  return (
    <nav className="flex flex-col gap-1 px-2 py-4">
      {navItems.map((item) => {
        const fullPath = `${basePath}${item.href}`;
        const isActive =
          item.href === ""
            ? pathname === basePath
            : pathname.startsWith(fullPath);

        return (
          <Link
            key={item.label}
            href={fullPath}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
