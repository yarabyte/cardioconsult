"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { listDocsToValidateAction } from "@/server/actions/documents";
import { StatusBadge } from "@/components/clinical/StatusBadge";

type DocRow = { id: string; title: string; status: string; version: number };

function useDocsToValidate() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const r = await listDocsToValidateAction();
      if (r.ok) {
        setDocs(
          r.docs.map((d) => ({
            id: d.id,
            title: d.title,
            status: d.status,
            version: d.version,
          })),
        );
      }
      setLoaded(true);
    });
  }, []);

  return { docs, loaded };
}

/** Panneau compact (colonne droite du tableau de bord). */
export function DocumentsToValidate() {
  const { docs, loaded } = useDocsToValidate();

  return (
    <section className="surface-card">
      <div className="border-separator flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-base font-extrabold">Documents à valider</h2>
        {docs.length > 0 ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
            {docs.length}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-4 text-sm">
        {!loaded ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : docs.length === 0 ? (
          <p className="text-muted-foreground">Aucun document en attente.</p>
        ) : (
          docs.slice(0, 4).map((d) => (
            <div
              key={d.id}
              className="border-border flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">{d.title}</p>
                <p className="text-muted-foreground text-xs">v{d.version}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  variant={d.status === "valide" ? "calcule" : "incomplet"}
                  label={d.status === "valide" ? "Validé" : "Brouillon"}
                />
                <Link href={`/comptes-rendus/${d.id}`} className="text-primary text-xs font-bold">
                  Ouvrir
                </Link>
              </div>
            </div>
          ))
        )}
        {docs.length > 4 ? (
          <Link href="#documents-a-valider" className="text-primary text-xs font-bold">
            +{docs.length - 4} autres
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** Bandeau pleine largeur — cartes cliquables (bas de page). */
export function DocumentsToValidateStrip() {
  const { docs, loaded } = useDocsToValidate();

  return (
    <section id="documents-a-valider" className="surface-card scroll-mt-6">
      <div className="border-separator flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-base font-extrabold">Documents à valider</h2>
        {docs.length > 0 ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
            {docs.length}
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {!loaded ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : docs.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-sm">Aucun document en attente.</p>
        ) : (
          docs.map((d) => (
            <Link
              key={d.id}
              href={`/comptes-rendus/${d.id}`}
              className="border-border hover:border-primary/40 hover:bg-muted/40 block rounded-xl border p-3.5 no-underline transition-colors"
            >
              <p className="text-xs font-bold text-amber-700">
                {d.status === "valide" ? "Validé" : "Brouillon"} · CR
              </p>
              <p className="mt-1 font-bold text-[var(--foreground)]">{d.title}</p>
              <p className="text-muted-foreground mt-1 text-[13px]">v{d.version}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
