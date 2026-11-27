import { Suspense } from "react";
import { PatientsListClient } from "@/components/patients/PatientsListClient";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { listPatients } from "@/server/services/patients/service";

type Props = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = { title: "Patients" };

export default async function PatientsPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantPage({ permission: "patient.read" });
  if (ctx.tenant.slug !== slug) return null;

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const pathology = typeof sp.pathology === "string" ? sp.pathology : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const result = await listPatients(ctx.tenant.id, {
    q,
    pathology,
    page,
    pageSize: 10,
  });

  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Chargement…</p>}>
      <PatientsListClient
        patients={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        initialQ={q}
        initialPathology={pathology}
      />
    </Suspense>
  );
}
