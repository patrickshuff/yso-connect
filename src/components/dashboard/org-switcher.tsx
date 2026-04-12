"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";

interface OrgSwitcherProps {
  currentOrgId: string;
  currentOrgName: string;
  orgs: Array<{ id: string; name: string }>;
}

export function OrgSwitcher({
  currentOrgId,
  currentOrgName,
  orgs,
}: OrgSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function selectOrg(orgId: string) {
    setOpen(false);
    router.push(`/dashboard/${orgId}`);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold outline-none hover:bg-zinc-100 focus-visible:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800"
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
            <Building2 className="size-3.5" />
          </div>
          <span className="truncate">{currentOrgName}</span>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-popover text-popover-foreground shadow-md dark:border-zinc-800">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Organizations
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {orgs.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => selectOrg(org.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="truncate">{org.name}</span>
                  {org.id === currentOrgId && (
                    <Check className="size-4 shrink-0 text-primary" />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/quick-setup");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Plus className="size-4" />
              <span>Create organization</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
