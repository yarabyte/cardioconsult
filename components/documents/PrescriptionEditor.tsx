"use client";

import { useState } from "react";
import type { Prescription, PrescriptionLine } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/lib/rbac";
import type { DemoUser } from "@/types/domain";
import { Trash2 } from "lucide-react";

function newLine(): PrescriptionLine {
  return { id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, drug: "", posology: "", duration: "" };
}

export function PrescriptionEditor({
  rx: initial,
  user,
  allergies,
}: {
  rx: Prescription;
  user: DemoUser;
  allergies: string[];
}) {
  const [rx, setRx] = useState(initial);
  const mayValidate = can(user, "prescription.validate");

  const updateLine = (id: string, patch: Partial<PrescriptionLine>) => {
    setRx((r) => ({
      ...r,
      lines: r.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const addLine = () => setRx((r) => ({ ...r, lines: [...r.lines, newLine()] }));
  const removeLine = (id: string) => setRx((r) => ({ ...r, lines: r.lines.filter((l) => l.id !== id) }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Ordonnance</h1>
        <p className="text-muted-foreground mt-1 text-sm">Aucune dose préremplie · brouillon</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Lignes de prescription</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rx.lines.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune ligne — ajoutez un médicament.</p>
          ) : null}
          {rx.lines.map((line) => (
            <div key={line.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_auto]">
              <Input
                aria-label="Médicament"
                placeholder="Médicament"
                value={line.drug}
                onChange={(e) => updateLine(line.id, { drug: e.target.value })}
              />
              <Input
                aria-label="Posologie"
                placeholder="Posologie (saisie libre)"
                value={line.posology}
                onChange={(e) => updateLine(line.id, { posology: e.target.value })}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.id)} aria-label="Supprimer la ligne">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vérifications</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>Allergies connues : {allergies.length ? allergies.join(", ") : "aucune"}</p>
          <p>DFG / kaliémie : à confirmer depuis le laboratoire mock.</p>
          <p>Interactions médicamenteuses : base non connectée (démonstration).</p>
        </CardContent>
      </Card>

      <Button type="button" disabled={!mayValidate || rx.lines.length === 0}>
        Valider l&apos;ordonnance
      </Button>
    </div>
  );
}