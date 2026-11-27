import { notFound } from "next/navigation";
import { SettingsSubnav } from "@/components/admin/SettingsSubnav";
import { BillingSettingsClient } from "@/components/admin/BillingSettingsClient";
import { requireTenantPage } from "@/server/auth/require-tenant-page";

type Props = { params: Promise<{ tenant: string }> };

export const metadata = { title: "Abonnement" };

export default async function AbonnementPage({ params }: Props) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantPage({ permission: "billing.manage" });
  if (ctx.tenant.slug !== slug) notFound();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <SettingsSubnav />
      <BillingSettingsClient />
    </div>
  );
}
