import { emptyEcho, type EchoData } from "./draft-types";

/** Modèles — jamais appliqués sans confirmation utilisateur. */
export const ECHO_TEMPLATES: Record<string, { label: string; data: EchoData }> = {
  ett_normale: {
    label: "ETT normale",
    data: {
      ...emptyEcho(),
      fevg: 60,
      fevgMethod: "Simpson biplan",
      dtdvgMm: 50,
      septumMm: 10,
      posteriorWallMm: 9,
      conclusion:
        "Ventricule gauche non dilaté, FEVG conservée. Pas d'anomalie valvulaire significative décrite dans ce modèle — à valider cliniquement.",
    },
  },
};
