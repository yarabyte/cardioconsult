import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TenantAppNotFound() {
  return (
    <div className="bg-card border-border mx-auto max-w-lg rounded-2xl border p-8 text-center">
      <h1 className="text-2xl font-extrabold">Page introuvable</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Cette ressource n&apos;existe pas ou vous n&apos;y avez pas accès avec votre rôle.
      </p>
      <Button className="mt-6" render={<Link href="/tableau-de-bord" />}>
        Retour au tableau de bord
      </Button>
    </div>
  );
}