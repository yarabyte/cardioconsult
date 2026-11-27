/**
 * Drill de restauration (P19) — produit un rapport synthétique.
 * N'accède à aucune base de production réelle ; à brancher sur l'API hébergeur.
 *
 * Usage : pnpm exec tsx scripts/restore-drill.ts --report
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const RPO_TARGET_MIN = 15;
const RTO_TARGET_H = 4;

function main() {
  const started = Date.now();
  const reportOnly = process.argv.includes("--report");

  // Simulation : en prod, appeler PITR / restore dump chiffré sur tenant de test.
  const steps = [
    "Vérifier backup / PITR disponible",
    "Restaurer tenant de test (données synthétiques)",
    "Vérifier migrations et healthcheck",
    "Contrôler ouverture dossier synthétique",
  ];

  const durationMs = Date.now() - started + 1200; // floor démo
  const durationMin = durationMs / 60_000;
  const rtoOk = durationMin / 60 <= RTO_TARGET_H;

  const report = {
    at: new Date().toISOString(),
    mode: reportOnly ? "report" : "dry-run",
    targets: { rpoMinutes: RPO_TARGET_MIN, rtoHours: RTO_TARGET_H },
    measured: {
      durationMinutes: Number(durationMin.toFixed(3)),
      rpoNote: "Mesure RPO = âge du dernier WAL / snapshot (à lire chez l'hébergeur)",
      rtoOk,
    },
    steps,
    outcome: rtoOk ? "PASS_SIMULATED" : "FAIL",
    disclaimer:
      "Rapport simulé — exécuter le drill réel dans le périmètre HDS avant le premier cabinet réel.",
  };

  const dir = join(process.cwd(), "docs/exploitation/rapports");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `restore-drill-${report.at.replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, file, report }, null, 2));
}

main();
