import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { ProvisioningWaitClient } from "./ProvisioningWaitClient";

export const metadata = { title: "Préparation de l’espace" };

export default async function AttenteProvisionPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen flex-col">
          <header className="border-separator flex items-center border-b px-6 py-5">
            <Logo variant="clair" width={180} />
          </header>
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6">
            <p className="text-muted-foreground text-sm">Chargement…</p>
          </div>
        </div>
      }
    >
      <ProvisioningWaitClient tenantId={tenantId} />
    </Suspense>
  );
}
