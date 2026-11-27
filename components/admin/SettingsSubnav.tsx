"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/parametres/equipe", label: "Équipe & rôles" },
  { href: "/parametres/abonnement", label: "Abonnement & factures" },
  { href: "/parametres/donnees-rgpd", label: "Données et RGPD" },
  { href: "/parametres/securite", label: "Sécurité & journal d'audit" },
] as const;

export function SettingsSubnav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Rubriques des paramètres"
      className="border-border bg-card flex max-w-[250px] min-w-0 flex-1 basis-[220px] flex-col gap-0.5 rounded-2xl border p-2.5 text-sm"
    >
      {LINKS.map((l) => {
        const active = pathname.includes(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2.5 font-semibold",
              active ? "bg-primary-soft text-primary font-extrabold" : "text-foreground/80",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
