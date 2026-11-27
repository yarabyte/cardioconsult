"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { LogOut, Menu, Plus, Search } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSidebar } from "./AppSidebar";
import type { Role } from "@/types/domain";
import type { SidebarOpenDossier } from "@/server/services/patients/open-dossiers";
import { useRouter } from "next/navigation";
import { listPatientsAction } from "@/server/actions/patients";
import { ageAt, patientDisplayName } from "@/lib/format";
import { authClient } from "@/lib/auth-client";

type SearchHit = {
  id: string;
  label: string;
  dossierNumber?: string;
  age?: number;
};

export function Topbar({
  role,
  isTenantAdmin = false,
  userName,
  tenantName,
  primaryAction,
  openDossiers = [],
}: {
  role: Role;
  isTenantAdmin?: boolean;
  userName: string;
  tenantName?: string;
  primaryAction?: { label: string; href: string };
  openDossiers?: SidebarOpenDossier[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, start] = useTransition();
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
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

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const t = setTimeout(() => {
      start(async () => {
        const r = await listPatientsAction({
          q: q || undefined,
          page: 1,
          pageSize: 20,
        });
        if (!r.ok) {
          setHits([]);
          return;
        }
        const today = new Date().toISOString().slice(0, 10);
        setHits(
          r.items.map((p) => ({
            id: p.id,
            label: patientDisplayName(p.firstName, p.lastName),
            dossierNumber: p.dossierNumber,
            age: ageAt(p.birthDate, today),
          })),
        );
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const shortcut = isMac ? "⌘K" : "Ctrl K";
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="border-separator bg-card/95 supports-backdrop-filter:bg-card/85 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-md lg:px-6">
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="border-border size-11 rounded-[10px] lg:hidden"
            />
          }
        >
          <Menu className="size-4" />
          <span className="sr-only">Ouvrir le menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <AppSidebar
            role={role}
            isTenantAdmin={isTenantAdmin}
            tenantName={tenantName}
            openDossiers={openDossiers}
            mobile
          />
        </SheetContent>
      </Sheet>

      <Button
        variant="outline"
        className="border-border bg-background text-muted-foreground hover:bg-muted/80 h-11 max-w-xl flex-1 justify-start gap-2 rounded-[10px] px-3 shadow-none"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4 shrink-0 opacity-70" />
        <span className="truncate text-left text-sm">Patient, n° de dossier…</span>
        <kbd className="border-border bg-card text-muted-foreground ml-auto hidden rounded-md border px-1.5 py-0.5 text-[11px] font-semibold sm:inline">
          {shortcut}
        </kbd>
      </Button>

      {primaryAction ? (
        <Button
          className="hidden h-11 rounded-[10px] px-4 font-bold sm:inline-flex"
          onClick={() => router.push(primaryAction.href)}
        >
          <Plus className="size-4" />
          {primaryAction.label}
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          className="bg-primary-soft text-primary ring-border hover:ring-primary/40 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-extrabold ring-1 transition-shadow outline-none"
          aria-label={`Compte — ${userName}`}
        >
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-bold">{userName}</p>
            {tenantName ? (
              <p className="text-muted-foreground truncate text-xs">{tenantName}</p>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              void (async () => {
                await authClient.signOut();
                window.location.assign("/connexion");
              })();
            }}
          >
            <LogOut className="size-4" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery("");
        }}
      >
        <CommandInput
          placeholder="Nom, prénom ou n° dossier…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{pending ? "Recherche…" : "Aucun patient trouvé."}</CommandEmpty>
          <CommandGroup heading="Patients">
            {hits.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.label} ${p.dossierNumber ?? ""}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/patients/${p.id}`);
                }}
              >
                <span className="font-semibold">{p.label}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {p.age != null ? `${p.age} ans` : null}
                  {p.dossierNumber ? ` · ${p.dossierNumber}` : null}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
