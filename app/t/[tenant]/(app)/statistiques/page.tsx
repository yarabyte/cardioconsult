import { StatsClient } from "@/components/stats/StatsClient";
import { requireTenantPage } from "@/server/auth/require-tenant-page";

export const metadata = { title: "Statistiques" };

export default async function StatistiquesPage() {
  await requireTenantPage({ permission: "stats.read" });
  return <StatsClient />;
}
