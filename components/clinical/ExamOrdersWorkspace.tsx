"use client";

import { useMemo, useState } from "react";
import {
  EXAM_ORDER_CATALOG_VERSION,
  addCoreItems,
  addCustomExam,
  buildExamOrderPreview,
  filterProtocols,
  getProtocol,
  isItemSelected,
  listExamOrderFilters,
  removeSelectedItem,
  toggleOptionalItem,
  type ExamOrderGroupFilter,
  type ExamOrdersDraft,
} from "@/lib/exam-orders";
import { EXAM_ORDER_PRIORITIES } from "@/lib/exam-orders/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  value: ExamOrdersDraft;
  disabled?: boolean;
  flagEnabled: boolean;
  onChange: (next: ExamOrdersDraft) => void;
};

export function ExamOrdersWorkspace({ value, disabled, flagEnabled, onChange }: Props) {
  const [customLabel, setCustomLabel] = useState("");
  const [search, setSearch] = useState("");

  const protocols = useMemo(() => filterProtocols(value.groupFilter), [value.groupFilter]);
  const active = value.activeProtocolId ? getProtocol(value.activeProtocolId) : undefined;

  const preview = useMemo(() => buildExamOrderPreview(value), [value]);

  if (!flagEnabled) {
    return (
      <Alert>
        <AlertTitle>Module désactivé</AlertTitle>
        <AlertDescription>
          La prescription d’examens complémentaires (<code>clinical.examOrders</code>) est
          désactivée pour ce cabinet. Aucune écriture n’est effectuée.
        </AlertDescription>
      </Alert>
    );
  }

  const patch = (partial: Partial<ExamOrdersDraft>) => {
    if (disabled) return;
    onChange({ ...value, ...partial });
  };

  const options = active
    ? [...active.core, ...active.optional].filter((item) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          (item.hint?.toLowerCase().includes(q) ?? false)
        );
      })
    : [];

  return (
    <div className="space-y-5">
      <Alert>
        <AlertTitle>Brouillon documentaire — non exécutoire</AlertTitle>
        <AlertDescription>
          Catalogue {EXAM_ORDER_CATALOG_VERSION}. Aucun laboratoire connecté, aucune signature,
          aucun envoi d’ordonnance réelle. Chaque examen requiert une indication et une validation
          médicale. En cas de suspicion de syndrome coronarien aigu, suivre le protocole de soins
          urgent — ne pas attendre cet outil.
        </AlertDescription>
      </Alert>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrer les familles de bilans"
      >
        {listExamOrderFilters().map((g) => {
          const activeFilter = value.groupFilter === g;
          return (
            <Button
              key={g}
              type="button"
              size="sm"
              variant={activeFilter ? "default" : "outline"}
              disabled={disabled}
              onClick={() => patch({ groupFilter: g as ExamOrderGroupFilter })}
            >
              {g}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border-border space-y-3 rounded-xl border p-4">
          <h3 className="text-sm font-extrabold">Bibliothèque de bilans</h3>
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {protocols.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                    value.activeProtocolId === p.id
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => patch({ activeProtocolId: p.id })}
                >
                  <span className="block">{p.label}</span>
                  <span className="text-muted-foreground text-xs">{p.group}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-border space-y-3 rounded-xl border p-4">
          <h3 className="text-sm font-extrabold">{active ? active.label : "Choisir un bilan"}</h3>
          {active ? (
            <>
              <p className="text-muted-foreground text-sm">{active.description}</p>
              {active.flags.endocarditisPrecaution ? (
                <p className="text-sm font-semibold text-amber-800">
                  Trois séries d’hémocultures avant antibiothérapie si réalisable — ne pas retarder
                  l’antibiothérapie si le patient est instable.
                </p>
              ) : null}
              {active.flags.dynamicTest ? (
                <p className="text-sm font-semibold text-amber-800">
                  Test dynamique spécialisé : planifier avec le service / laboratoire. Pas
                  d’administration médicamenteuse automatisée.
                </p>
              ) : null}
              {active.flags.noAutoDrugStop ? (
                <p className="text-sm font-semibold text-amber-800">
                  Ne jamais arrêter automatiquement les antihypertenseurs. Consigner traitements et
                  conditions de prélèvement.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled || active.core.length === 0}
                  onClick={() =>
                    patch({
                      selected: addCoreItems(value.selected, active),
                    })
                  }
                >
                  Ajouter le bilan de base
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || value.selected.length === 0}
                  onClick={() => patch({ selected: [] })}
                >
                  Vider la sélection
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-search">Filtrer les examens proposés</Label>
                <Input
                  id="ex-search"
                  value={search}
                  disabled={disabled}
                  placeholder="Ex. hémocultures, ECBU, cortisol…"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {options.map((item) => {
                  const checked = isItemSelected(value.selected, item.id);
                  const isCore = active.core.some((c) => c.id === item.id);
                  return (
                    <li key={item.id} className="flex gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        disabled={disabled}
                        id={`ex-item-${item.id}`}
                        onChange={() =>
                          patch({
                            selected: toggleOptionalItem(value.selected, active, item.id),
                          })
                        }
                      />
                      <label htmlFor={`ex-item-${item.id}`} className="min-w-0 cursor-pointer">
                        <span className="font-semibold">
                          {item.label}
                          {isCore ? (
                            <span className="text-muted-foreground font-normal"> · base</span>
                          ) : null}
                        </span>
                        {item.hint ? (
                          <span className="text-muted-foreground block text-xs">{item.hint}</span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1 space-y-1.5">
                  <Label htmlFor="ex-custom">Examen non listé</Label>
                  <Input
                    id="ex-custom"
                    value={customLabel}
                    disabled={disabled}
                    maxLength={150}
                    placeholder="Nom de l’examen personnalisé"
                    onChange={(e) => setCustomLabel(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || !customLabel.trim()}
                  onClick={() => {
                    patch({ selected: addCustomExam(value.selected, customLabel) });
                    setCustomLabel("");
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Sélectionnez un bilan dans la bibliothèque.
            </p>
          )}
        </section>
      </div>

      <section className="border-border space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-extrabold">Projet de prescription</h3>
          <p className="text-muted-foreground text-xs tabular-nums">
            {value.selected.length} examen{value.selected.length === 1 ? "" : "s"} sélectionné
            {value.selected.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ex-priority">Priorité</Label>
            <select
              id="ex-priority"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              disabled={disabled}
              value={value.priority}
              onChange={(e) =>
                patch({
                  priority: e.target.value as ExamOrdersDraft["priority"],
                })
              }
            >
              {EXAM_ORDER_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-date">Date souhaitée</Label>
            <Input
              id="ex-date"
              type="date"
              disabled={disabled}
              value={value.desiredDate ?? ""}
              onChange={(e) => patch({ desiredDate: e.target.value || null })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ex-indication">Indication clinique</Label>
          <Textarea
            id="ex-indication"
            rows={2}
            disabled={disabled}
            placeholder="Motif précis et hypothèses diagnostiques…"
            value={value.indication ?? ""}
            onChange={(e) => patch({ indication: e.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ex-prelev">Consignes / informations de prélèvement</Label>
          <Textarea
            id="ex-prelev"
            rows={2}
            disabled={disabled}
            placeholder="Selon laboratoire et examen. Ne pas imposer un jeûne systématique."
            value={value.samplingNotes ?? ""}
            onChange={(e) => patch({ samplingNotes: e.target.value || null })}
          />
        </div>
        {value.selected.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {value.selected.map((item) => (
              <li
                key={item.id}
                className="border-border bg-muted/40 inline-flex items-center gap-2 rounded-full border px-3 py-1"
              >
                <span>{item.label}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive text-xs font-bold"
                  disabled={disabled}
                  aria-label={`Retirer ${item.label}`}
                  onClick={() => patch({ selected: removeSelectedItem(value.selected, item.id) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="ex-preview">Aperçu du brouillon</Label>
          <Textarea
            id="ex-preview"
            readOnly
            rows={10}
            className="font-mono text-xs"
            value={preview}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(preview);
              } catch {
                /* ignore */
              }
            }}
          >
            Copier le brouillon
          </Button>
        </div>
      </section>
    </div>
  );
}
