"use client";

import { useEffect, useState } from "react";
import { Bell, Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AppSidebar } from "./AppSidebar";
import type { Role } from "@/types/domain";
import { useRouter } from "next/navigation";

export function Topbar({
  role,
  userName,
  tenantName,
  primaryAction,
  patients = [],
}: {
  role: Role;
  userName: string;
  tenantName?: string;
  primaryAction?: { label: string; href: string };
  patients?: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="border-separator bg-card sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4">
      <Sheet>
        <SheetTrigger
          render={<Button variant="outline" size="icon" className="lg:hidden" />}
        >
          <Menu className="size-4" />
          <span className="sr-only">Ouvrir le menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <AppSidebar role={role} tenantName={tenantName} mobile />
        </SheetContent>
      </Sheet>

      <Button
        variant="outline"
        className="text-muted-foreground max-w-md flex-1 justify-start gap-2"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="truncate">Rechercher un patient…</span>
        <kbd className="bg-muted ml-auto hidden rounded px-1.5 py-0.5 text-[10px] font-semibold sm:inline">
          Ctrl K
        </kbd>
      </Button>

      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="size-4" />
      </Button>

      {primaryAction ? (
        <Button
          className="hidden sm:inline-flex"
          onClick={() => router.push(primaryAction.href)}
        >
          <Plus className="size-4" />
          {primaryAction.label}
        </Button>
      ) : null}

      <div className="bg-primary-soft text-primary flex size-9 items-center justify-center rounded-full text-xs font-extrabold">
        {userName
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")}
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher un patient…" />
        <CommandList>
          <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
          <CommandGroup heading="Patients">
            {patients.map((p) => (
              <CommandItem
                key={p.id}
                value={p.label}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/patients/${p.id}`);
                }}
              >
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
