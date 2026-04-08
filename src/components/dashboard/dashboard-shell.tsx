"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

interface DashboardShellProps {
  orgId: string;
  orgName: string;
  children: React.ReactNode;
}

export function DashboardShell({
  orgId,
  orgName,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 lg:block">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {orgName}
          </span>
        </div>
        <SidebarNav orgId={orgId} />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden" />
                }
              >
                <Menu className="size-5" />
                <span className="sr-only">Open navigation</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="border-b border-zinc-200 dark:border-zinc-800">
                  <SheetTitle>{orgName}</SheetTitle>
                </SheetHeader>
                <div onClick={() => setMobileOpen(false)}>
                  <SidebarNav orgId={orgId} />
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 lg:hidden">
              {orgName}
            </h1>
            <h1 className="hidden text-lg font-semibold text-zinc-900 dark:text-zinc-50 lg:block">
              YSO Connect
            </h1>
          </div>
          <UserButton />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
