import { uuidv7 } from "uuidv7";
import {
  patients,
  patientAllergies,
  patientIdentityEnc,
  featureFlags,
  tenantCounters,
} from "@/db/tenant/schema";
import { withTenantDb } from "@/server/db/tenant-db";
import { SYNTHETIC_PATIENTS } from "./synthetic-patients";
import { seedDemoWorkflowOnDb } from "./seed-workflow-demo";
import { seedHospitalisationDemoOnDb } from "./seed-hospitalisation-demo";
import { seedAgendaDemoOnDb } from "./seed-agenda-demo";

/** Jeu de démonstration synthétique, clairement étiqueté (aucune donnée réelle). */
export async function seedSyntheticPatients(tenantId: string): Promise<void> {
  await withTenantDb(tenantId, async (db) => {
    await db
      .insert(featureFlags)
      .values({ key: "demo_data", enabled: true })
      .onConflictDoUpdate({
        target: featureFlags.key,
        set: { enabled: true, updatedAt: new Date() },
      });

    let seq = 184;
    for (const p of SYNTHETIC_PATIENTS) {
      const id = uuidv7();
      const dossierNumber = `CC-${String(seq++).padStart(6, "0")}`;
      await db.insert(patients).values({ id, dossierNumber });
      await db.insert(patientIdentityEnc).values({
        patientId: id,
        firstNameEnc: p.firstName,
        lastNameEnc: p.lastName,
        birthDateEnc: p.birthDate,
        sex: p.sex,
        insStatus: "non_qualifiee",
        dossierNumber,
        firstNameBlind: p.firstName,
        lastNameBlind: p.lastName,
        birthDateBlind: p.birthDate,
      });
      for (const substance of p.allergies) {
        await db.insert(patientAllergies).values({
          id: uuidv7(),
          patientId: id,
          substance,
          severity: "non_renseignee",
          source: "dossier",
        });
      }
    }

    await db
      .insert(tenantCounters)
      .values({ key: "dossier", value: seq - 1 })
      .onConflictDoUpdate({
        target: tenantCounters.key,
        set: { value: seq - 1 },
      });

    await seedDemoWorkflowOnDb(db);
    await seedAgendaDemoOnDb(db);
    await seedHospitalisationDemoOnDb(db);
  });
}
