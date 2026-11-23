"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { navForRole } from "@/lib/rbac";
import type { Role } from "@/types/domain";

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
  tenantName,
  mobile = false,
}: {
  role: Role;
  tenantName?: string;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <aside
      className={cn(
        "border-sidebar-border bg-sidebar text-sidebar-foreground w-64 shrink-0 flex-col border-r",
        mobile ? "flex h-full" : "hidden lg:flex",
      )}
    >
      <div className="flex items-center gap-2 border-b border-separator px-5 py-4">
        <Logo variant="icone" width={32} height={32} />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">CardioConsult</p>
          {tenantName ? (
            <p className="text-muted-foreground truncate text-xs">{tenantName}</p>
          ) : null}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navigation principale">
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
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-foreground/80 hover:bg-muted",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
