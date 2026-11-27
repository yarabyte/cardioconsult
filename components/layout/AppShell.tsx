import { SupportBanner } from "./SupportBanner";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import type { Role } from "@/types/domain";
import type { SidebarOpenDossier } from "@/server/services/patients/open-dossiers";

export function AppShell({
  role,
  isTenantAdmin,
  userName,
  tenantName,
  tenantId,
  primaryAction,
  openDossiers = [],
  children,
}: {
  role: Role;
  isTenantAdmin?: boolean;
  userName: string;
  tenantName?: string;
  tenantId?: string;
  primaryAction?: { label: string; href: string };
  openDossiers?: SidebarOpenDossier[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {tenantId ? <SupportBanner tenantId={tenantId} isTenantAdmin={isTenantAdmin} /> : null}
      <div className="flex min-h-0 flex-1">
        <AppSidebar
          role={role}
          isTenantAdmin={isTenantAdmin}
          tenantName={tenantName}
          openDossiers={openDossiers}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          <Topbar
            role={role}
            isTenantAdmin={isTenantAdmin}
            userName={userName}
            tenantName={tenantName}
            primaryAction={primaryAction}
            openDossiers={openDossiers}
          />
          <main id="contenu-principal" className="app-atmosphere flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
