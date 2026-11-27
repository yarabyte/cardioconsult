import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
  homeForRole,
  isRoleAllowedOnPath,
  normalizeTenantPath,
  primaryActionForRole,
} from "@/lib/route-access";
import { can } from "@/lib/rbac";
import { getConsoleOrigin } from "@/lib/console-url";
import { requireContext } from "@/server/auth/require-context";
import { getControlDb } from "@/server/db/control-db";
import { tenants } from "@/db/control/schema";
import { listSidebarOpenDossiers } from "@/server/services/patients/open-dossiers";
import { findTenantBySlug } from "@/server/tenants/by-slug";

type Props = LayoutProps<"/t/[tenant]">;

export default async function TenantAppLayout({ children, params }: Props) {
  const { tenant: slug } = await params;

  // Avant auth : un sous-domaine inconnu ne doit jamais entrer dans le shell cabinet.
  if (!(await findTenantBySlug(slug))) notFound();

  const ctx = await requireContext({ permission: "patient.read" });

  if (ctx.role === "SUPERADMIN") {
    redirect(getConsoleOrigin());
  }

  if (!ctx.tenant || ctx.tenant.slug !== slug) notFound();

  const h = await headers();
  const rawPath = h.get("x-pathname") ?? `/t/${slug}/tableau-de-bord`;
  const path = normalizeTenantPath(rawPath);

  if (!isRoleAllowedOnPath(ctx.role, path)) {
    redirect(homeForRole(ctx.role));
  }

  const subject = { role: ctx.role, isTenantAdmin: ctx.user.isTenantAdmin };
  if (path.startsWith("/parametres/equipe") && !can(subject, "team.manage")) {
    redirect(homeForRole(ctx.role));
  }
  if (path.startsWith("/parametres/securite") && !can(subject, "audit.read")) {
    redirect(homeForRole(ctx.role));
  }
  if (path.startsWith("/parametres/donnees-rgpd") && !can(subject, "settings.manage")) {
    redirect(homeForRole(ctx.role));
  }
  if (path.startsWith("/parametres/abonnement") && !can(subject, "billing.manage")) {
    redirect(homeForRole(ctx.role));
  }

  const control = getControlDb();
  const [tenantRow] = await control
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenant.id))
    .limit(1);
  const tenantName = tenantRow?.name ?? slug;

  let openDossiers: Awaited<ReturnType<typeof listSidebarOpenDossiers>> = [];
  try {
    openDossiers = await listSidebarOpenDossiers(ctx.tenant.id, ctx.user.id);
  } catch {
    openDossiers = [];
  }

  return (
    <AppShell
      role={ctx.role}
      isTenantAdmin={ctx.user.isTenantAdmin}
      userName={ctx.user.name}
      tenantName={tenantName}
      tenantId={ctx.tenant.id}
      primaryAction={primaryActionForRole(ctx.role)}
      openDossiers={openDossiers}
    >
      {children}
    </AppShell>
  );
}
