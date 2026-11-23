import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getDemoUser } from "@/lib/demo-user";
import { MockPatientRepository, MockTenantRepository } from "@/lib/data/repositories";
import { isRoleAllowedOnPath, primaryActionForRole } from "@/lib/route-access";
import { can } from "@/lib/rbac";
import { TENANT_MARTIN_ID } from "@/lib/mock/patients";

type Props = LayoutProps<"/t/[tenant]">;

/** Tenant shell reads cookies/headers/params — allow blocking render (Cache Components). */
export const instant = false;

export default async function TenantAppLayout({ children, params }: Props) {
  const { tenant: slug } = await params;
  const user = await getDemoUser();
  const tenant = await MockTenantRepository.getBySlug(slug);

  if (!tenant) notFound();

  const h = await headers();
  const pathname = h.get("x-pathname") ?? `/t/${slug}/tableau-de-bord`;

  if (user.role === "SUPERADMIN") {
    redirect("/console");
  }

  if (user.tenantId && user.tenantId !== tenant.id) notFound();

  if (!isRoleAllowedOnPath(user.role, pathname)) notFound();

  if (pathname.includes("/parametres/equipe") && !can(user, "team.manage")) {
    notFound();
  }

  const patients =
    tenant.id === TENANT_MARTIN_ID ? await MockPatientRepository.list(tenant.id) : [];
  const patientOptions = patients.map((p) => ({
    id: p.id,
    label: `${p.firstName.charAt(0)}. ${p.lastName}`,
  }));

  return (
    <AppShell
      role={user.role}
      userName={user.name}
      tenantName={tenant.name}
      primaryAction={primaryActionForRole(user.role)}
      patients={patientOptions}
    >
      {children}
    </AppShell>
  );
}