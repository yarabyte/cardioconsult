import { notFound } from "next/navigation";
import { getTenant } from "@/lib/tenant";
import { findTenantBySlug } from "@/server/tenants/by-slug";

type Props = LayoutProps<"/t/[tenant]">;

/** Connexion / MFA : refuse tout slug inconnu ou hors hôte. */
export default async function TenantAuthLayout({ children, params }: Props) {
  const { tenant: slug } = await params;
  const hostSlug = await getTenant();
  if (hostSlug && hostSlug !== slug) notFound();

  const tenant = await findTenantBySlug(slug);
  if (!tenant) notFound();

  return children;
}
