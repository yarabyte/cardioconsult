"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPatientAction } from "@/server/actions/patients";
import { CarteVitalePanel } from "@/components/patients/CarteVitalePanel";

export function PatientCreateForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sex, setSex] = useState<"F" | "H" | "Autre" | "NonRenseigne">("NonRenseigne");
  const [duplicates, setDuplicates] = useState<
    Array<{ id: string; dossierNumber: string; label: string }>
  >([]);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [allergy, setAllergy] = useState("");

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const payload = {
      firstName: String(fd.get("firstName") ?? ""),
      lastName: String(fd.get("lastName") ?? ""),
      birthName: String(fd.get("birthName") ?? "") || null,
      birthDate: String(fd.get("birthDate") ?? ""),
      sex,
      email: String(fd.get("email") ?? "") || null,
      phone: String(fd.get("phone") ?? "") || null,
      treatingPhysician: String(fd.get("treatingPhysician") ?? "") || null,
      allergies: allergy.trim()
        ? [{ substance: allergy.trim(), severity: "non_renseignee" as const }]
        : [],
      devices: [] as [],
      confirmDuplicate,
    };

    start(async () => {
      const r = await createPatientAction(payload);
      if (!r.ok) {
        if (
          r.error &&
          typeof r.error === "object" &&
          "code" in r.error &&
          r.error.code === "duplicate" &&
          "duplicates" in r.error &&
          Array.isArray(r.error.duplicates)
        ) {
          setDuplicates(r.error.duplicates);
          setConfirmDuplicate(false);
          toast.message("Doublon possible — confirmez pour créer quand même.");
          return;
        }
        const msg =
          typeof r.error === "object" && r.error && "message" in r.error
            ? String(r.error.message)
            : "Échec";
        toast.error(msg);
        return;
      }
      toast.success(`Dossier ${r.dossierNumber} créé (INS non qualifiée).`);
      router.push(`/patients/${r.patientId}`);
      router.refresh();
    });
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <section className="surface-card space-y-4 p-5 md:p-6">
        <div>
          <h2 className="text-base font-extrabold">Identité</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Aucune valeur clinique préremplie. L&apos;INS reste « non qualifiée » tant que le
            téléservice INSi n&apos;est pas branché.
          </p>
        </div>

        <CarteVitalePanel />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="block gap-0">
              Nom d&apos;usage
            </Label>
            <Input
              id="lastName"
              name="lastName"
              required
              autoComplete="family-name"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthName" className="block gap-0">
              Nom de naissance
            </Label>
            <Input id="birthName" name="birthName" autoComplete="off" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="block gap-0">
              Prénom
            </Label>
            <Input
              id="firstName"
              name="firstName"
              required
              autoComplete="given-name"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthDate" className="block gap-0">
              Date de naissance
            </Label>
            <Input id="birthDate" name="birthDate" type="date" required className="h-11" />
          </div>
          <div className="space-y-1.5 sm:col-span-2 sm:max-w-xs">
            <Label className="block gap-0">Sexe</Label>
            <Select value={sex} onValueChange={(v) => setSex(v as typeof sex)}>
              <SelectTrigger aria-label="Sexe" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NonRenseigne">Non renseigné</SelectItem>
                <SelectItem value="F">Femme</SelectItem>
                <SelectItem value="H">Homme</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="surface-card space-y-4 p-5 md:p-6">
        <div>
          <h2 className="text-base font-extrabold">Coordonnées</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Optionnel — utile pour les rappels non cliniques.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="block gap-0">
              E-mail
            </Label>
            <Input id="email" name="email" type="email" className="h-11" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="block gap-0">
              Téléphone
            </Label>
            <Input id="phone" name="phone" className="h-11" autoComplete="tel" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="treatingPhysician" className="block gap-0">
              Médecin traitant
            </Label>
            <Input id="treatingPhysician" name="treatingPhysician" className="h-11" />
          </div>
        </div>
      </section>

      <section className="surface-card space-y-4 p-5 md:p-6">
        <div>
          <h2 className="text-base font-extrabold">Sécurité clinique</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Une allergie connue peut être notée ici. Laisser vide si non renseignée.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="allergy" className="block gap-0">
            Allergie (substance)
          </Label>
          <Input
            id="allergy"
            value={allergy}
            onChange={(e) => setAllergy(e.target.value)}
            placeholder="Ex. pénicilline — laisser vide si aucune"
            className="h-11"
          />
        </div>
      </section>

      {duplicates.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-amber-600/30 bg-amber-50/80 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-600/15 text-amber-800">
              <ShieldAlert className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-extrabold text-amber-950">Doublons potentiels</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
                Des dossiers proches existent déjà (index aveugle). Vérifiez avant de créer.
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/patients/${d.id}`}
                  className="border-border bg-card hover:border-primary/40 block rounded-xl border px-3.5 py-2.5 text-sm no-underline transition-colors"
                >
                  <span className="text-primary font-bold">{d.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{d.dossierNumber}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="confirmDuplicate"
              className="mt-0.5"
              checked={confirmDuplicate}
              onCheckedChange={(v) => setConfirmDuplicate(v === true)}
            />
            <Label
              htmlFor="confirmDuplicate"
              className="block min-w-0 flex-1 text-sm leading-relaxed font-normal text-amber-950"
            >
              Confirmer la création malgré le doublon éventuel
            </Label>
          </div>
        </section>
      ) : null}

      <div className="border-separator bg-background/95 sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t px-1 py-4 backdrop-blur-sm">
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2 rounded-[10px]"
          render={<Link href="/patients" />}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour à la liste
        </Button>
        <Button
          type="submit"
          className="h-11 rounded-[10px] px-6 font-bold"
          disabled={pending || (duplicates.length > 0 && !confirmDuplicate)}
        >
          {pending ? "Création…" : "Créer le dossier"}
        </Button>
      </div>
    </form>
  );
}
