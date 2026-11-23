import { DemoBanner } from "./DemoBanner";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { DemoRoleSwitcher } from "./DemoRoleSwitcher";
import type { Role } from "@/types/domain";

export function AppShell({
  role,
  userName,
  tenantName,
  primaryAction,
  patients,
  children,
}: {
  role: Role;
  userName: string;
  tenantName?: string;
  primaryAction?: { label: string; href: string };
  patients?: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <AppSidebar role={role} tenantName={tenantName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            role={role}
            userName={userName}
            tenantName={tenantName}
            primaryAction={primaryAction}
            patients={patients}
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
      <DemoRoleSwitcher current={role} />
    </div>
  );
}
