import { notFound } from "next/navigation";
import { SettingsSubnav } from "@/components/admin/SettingsSubnav";
import { RgpdSettingsClient } from "@/components/admin/RgpdSettingsClient";
import { requireTenantPage } from "@/server/auth/require-tenant-page";

type Props = { params: Promise<{ tenant: string }> };

export const metadata = { title: "Données et RGPD" };

export default async function DonneesRgpdPage({ params }: Props) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantPage({ permission: "settings.manage" });
  if (ctx.tenant.slug !== slug) notFound();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <SettingsSubnav />
      <RgpdSettingsClient />
    </div>
  );
}
