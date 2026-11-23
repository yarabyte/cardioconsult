import Link from "next/link";
import { MockAgendaRepository, MockTenantRepository } from "@/lib/data/repositories";
import { Badge } from "@/components/ui/badge";

type Props = PageProps<"/t/[tenant]/agenda">;

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await MockTenantRepository.getBySlug(slug);
  if (!tenant) return null;

  const rows = await MockAgendaRepository.listWeek(tenant.id);
  const days = [...new Set(rows.map((r) => r.day))];

  return (
    <div className="flex flex-col gap-4">
      <AgendaPageHeader />
      {days.map((day) => (
        <section key={day} className="bg-card border-border rounded-2xl border">
          <h2 className="border-separator border-b px-5 py-3 text-sm font-extrabold">{day}</h2>
          <ul className="divide-separator divide-y">
            {rows
              .filter((r) => r.day === day)
              .map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-14 font-bold tabular-nums">{r.time}</span>
                  <span className="min-w-[120px] flex-1 font-semibold">
                    {r.patientId ? (
                      <Link href={`/patients/${r.patientId}`} className="text-primary hover:underline">
                        {r.patientLabel}
                      </Link>
                    ) : (
                      r.patientLabel
                    )}
                  </span>
                  <span className="text-muted-foreground flex-1">{r.motif}</span>
                  {r.status ? <Badge variant="secondary">{r.status}</Badge> : null}
                  {r.motif.includes("ETT") ? (
                    <Link
                      href="/consultations/enc-ett-lefevre/echocardiographie"
                      className="text-primary text-xs font-bold"
                    >
                      Reprendre
                    </Link>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AgendaPageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Agenda</h1>
      <p className="text-muted-foreground mt-1 text-sm">Semaine du 23 novembre 2026</p>
    </div>
  );
}