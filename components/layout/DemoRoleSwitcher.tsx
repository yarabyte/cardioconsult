"use client";

import { useRouter } from "next/navigation";
import { DEMO_ROLE_COOKIE, isDemoMode } from "@/lib/demo-user-client";
import type { Role } from "@/types/domain";
import { cn } from "@/lib/utils";

const ROLES: { role: Role; label: string }[] = [
  { role: "MEDECIN", label: "Médecin" },
  { role: "INFIRMIERE", label: "Infirmière" },
  { role: "SUPERADMIN", label: "Super admin" },
];

export function DemoRoleSwitcher({ current }: { current: Role }) {
  const router = useRouter();
  if (!isDemoMode()) return null;

  return (
    <div className="border-separator bg-card fixed right-4 bottom-4 z-50 rounded-xl border p-2 shadow-lg">
      <p className="text-muted-foreground px-2 pb-1 text-[10px] font-bold tracking-wide uppercase">
        Démo · rôle
      </p>
      <div className="flex gap-1">
        {ROLES.map((r) => (
          <button
            key={r.role}
            type="button"
            aria-pressed={current === r.role}
            className={cn(
              "rounded-[10px] px-2.5 py-1.5 text-xs font-bold",
              current === r.role
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground",
            )}
            onClick={() => {
              document.cookie = `${DEMO_ROLE_COOKIE}=${r.role};path=/;max-age=31536000`;
              if (r.role === "SUPERADMIN") {
                window.location.href = "http://console.localhost:3000";
                return;
              }
              if (window.location.hostname === "console.localhost") {
                window.location.href = "http://dr-martin.localhost:3000/tableau-de-bord";
                return;
              }
              router.refresh();
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
