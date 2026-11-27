"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  FolderOpen,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { navForSubject } from "@/lib/rbac";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types/domain";
import type { SidebarOpenDossier } from "@/server/services/patients/open-dossiers";
import { dismissSidebarDossierAction } from "@/server/actions/patients";

async function signOutNow() {
  await authClient.signOut();
  window.location.assign("/connexion");
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/tableau-de-bord": LayoutDashboard,
  "/agenda": CalendarDays,
  "/patients": Users,
  "/hospitalisation": Hospital,
  "/statistiques": BarChart3,
  "/infirmiere": HeartPulse,
  "/parametres/equipe": Settings,
  "/": Activity,
};

export function AppSidebar({
  role,
  isTenantAdmin,
  tenantName,
  openDossiers = [],
  mobile = false,
}: {
  role: Role;
  isTenantAdmin?: boolean;
  tenantName?: string;
  openDossiers?: SidebarOpenDossier[];
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, start] = useTransition();
  const [visibleDossiers, removeOptimistic] = useOptimistic(
    openDossiers,
    (current, patientId: string) => current.filter((d) => d.patientId !== patientId),
  );
  const items = navForSubject({
    role,
    isTenantAdmin: isTenantAdmin ?? role === "MEDECIN",
  });

  function dismiss(patientId: string) {
    start(async () => {
      removeOptimistic(patientId);
      const r = await dismissSidebarDossierAction({ patientId });
      if (r.ok) router.refresh();
    });
  }

  return (
    <aside
      className={cn(
        "border-sidebar-border bg-sidebar text-sidebar-foreground w-64 shrink-0 flex-col border-r",
        mobile ? "flex h-full" : "hidden lg:flex",
      )}
    >
      <div className="border-separator space-y-3 border-b px-4 py-4">
        <Link href="/tableau-de-bord" className="inline-flex items-center gap-2 px-1">
          <Logo variant="clair" height={30} className="max-w-[176px]" />
          <span className="sr-only">{APP_NAME} — accueil</span>
        </Link>
        {tenantName ? (
          <div className="bg-background border-border rounded-xl border px-3 py-2.5">
            <p className="truncate text-[13px] leading-snug font-bold">{tenantName}</p>
            <p className="text-muted-foreground truncate text-[11px]">Espace cabinet</p>
          </div>
        ) : null}
      </div>
      <nav
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
        aria-label="Navigation principale"
      >
        {items.map((item) => {
          const Icon = ICONS[item.href] ?? Activity;
          const active =
            pathname === item.href ||
            pathname.endsWith(item.href) ||
            (item.href !== "/" && pathname.includes(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14.5px] font-semibold transition-colors",
                active
                  ? "bg-primary-soft text-primary nav-active-rail font-bold"
                  : "text-foreground/80 hover:bg-muted",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}

        <div className="border-separator mt-4 border-t pt-3">
          <p className="text-muted-foreground mb-2 flex items-center gap-1.5 px-3 text-[11px] font-bold tracking-wide uppercase">
            <FolderOpen className="size-3.5" aria-hidden />
            Dossiers ouverts
          </p>
          {visibleDossiers.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2 text-xs leading-relaxed">
              Aucun dossier ouvert. Ouvrez un patient ou démarrez une consultation.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5" aria-label="Dossiers ouverts">
              {visibleDossiers.map((d) => {
                const encounterId = d.href.match(/\/consultations\/([^/]+)/)?.[1];
                const active =
                  pathname.includes(`/patients/${d.patientId}`) ||
                  (encounterId != null && pathname.includes(`/consultations/${encounterId}`));
                return (
                  <li
                    key={`${d.kind}-${d.patientId}`}
                    className={cn(
                      "group/dossier flex items-start gap-0.5 rounded-[10px]",
                      active ? "bg-primary-soft" : "hover:bg-muted",
                    )}
                  >
                    <Link
                      href={d.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "min-w-0 flex-1 px-3 py-2 transition-colors",
                        active ? "text-primary" : "text-foreground/80",
                      )}
                    >
                      <span className="block truncate text-[13px] leading-snug font-bold">
                        {d.label}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[11px]",
                          d.kind === "en_cours"
                            ? "text-primary font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        {d.subtitle}
                      </span>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-foreground mt-1.5 mr-1.5 shrink-0 opacity-70 group-hover/dossier:opacity-100"
                      aria-label={`Retirer ${d.label} de la liste`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dismiss(d.patientId);
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>
      <div className="border-separator space-y-2 border-t px-3 py-3">
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive h-10 w-full justify-start gap-2 rounded-[10px] px-3 text-[13px] font-semibold"
          onClick={() => {
            void signOutNow();
          }}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Se déconnecter
        </Button>
        <p className="text-muted-foreground px-1 text-[11px] leading-relaxed">
          Données de santé · hébergement HDS
        </p>
      </div>
    </aside>
  );
}
