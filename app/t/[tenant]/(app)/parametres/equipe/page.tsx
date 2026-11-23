import { notFound } from "next/navigation";
import { MockTenantRepository } from "@/lib/data/repositories";
import { getDemoUser } from "@/lib/demo-user";
import { can } from "@/lib/rbac";
import { TeamSettingsClient } from "@/components/admin/TeamSettingsClient";

type Props = PageProps<"/t/[tenant]/parametres/equipe">;

export const metadata = { title: "Paramètres équipe" };

export default async function EquipePage({ params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await MockTenantRepository.getBySlug(slug);
  const user = await getDemoUser();

  if (!tenant || !can(user, "team.manage")) notFound();

  const members = await MockTenantRepository.listMembers(tenant.id);
  return <TeamSettingsClient members={members} />;
}