"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { trackFunnelEvent } from "@/lib/gtm";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
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
            YSO Connect
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <div className="ml-3">
            <Link
              href="/sign-up"
              className={buttonVariants({ size: "sm" })}
              onClick={() =>
                trackFunnelEvent("funnel_landing_cta_click", {
                  location: "landing_header_desktop",
                })
              }
            >
              Get Started
            </Link>
          </div>
        </nav>

        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <Menu className="size-5" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>YSO Connect</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 px-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-4 border-t pt-4">
                  <Link
                    href="/sign-up"
                    className={cn(buttonVariants({ size: "lg" }), "w-full")}
                    onClick={() =>
                      {
                        trackFunnelEvent("funnel_landing_cta_click", {
                          location: "landing_header_mobile",
                        });
                        setOpen(false);
                      }
                    }
                  >
                    Get Started
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
