import { cookies } from "next/headers";
import type { DemoUser, Role } from "@/types/domain";

export const DEMO_ROLE_COOKIE = "demo-role";

const USERS: Record<Role, DemoUser> = {
  MEDECIN: {
    id: "demo-medecin",
    name: "Dr Claire Martin",
    email: "c.martin@cabinet-martin.fr",
    role: "MEDECIN",
    isTenantAdmin: true,
    initials: "CM",
    tenantId: "tenant-martin",
  },
  INFIRMIERE: {
    id: "demo-ide",
    name: "Sophie Laurent",
    email: "s.laurent@cabinet-martin.fr",
    role: "INFIRMIERE",
    initials: "SL",
    tenantId: "tenant-martin",
  },
  SUPERADMIN: {
    id: "demo-sa",
    name: "Alex Platforme",
    email: "alex@cardioconsult.fr",
    role: "SUPERADMIN",
    initials: "AP",
    tenantId: null,
  },
};

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO === "true";
}

export async function getDemoUser(fallback: Role = "MEDECIN"): Promise<DemoUser> {
  const jar = await cookies();
  const raw = jar.get(DEMO_ROLE_COOKIE)?.value as Role | undefined;
  if (raw && USERS[raw]) return USERS[raw];
  return USERS[fallback];
}

export function demoUsers(): DemoUser[] {
  return Object.values(USERS);
}
