/**
 * Patients synthétiques alignés sur les maquettes (aucune donnée réelle).
 */
export const SYNTHETIC_PATIENTS = [
  {
    firstName: "Jeanne",
    lastName: "Dupont",
    birthDate: "1959-03-14",
    sex: "F" as const,
    allergies: ["pénicilline"],
  },
  {
    firstName: "Robert",
    lastName: "Lefèvre",
    birthDate: "1955-06-02",
    sex: "H" as const,
    allergies: [] as string[],
  },
  {
    firstName: "Mehdi",
    lastName: "Benali",
    birthDate: "1968-01-20",
    sex: "H" as const,
    allergies: [] as string[],
  },
  {
    firstName: "Annie",
    lastName: "Girard",
    birthDate: "1952-04-08",
    sex: "F" as const,
    allergies: [] as string[],
  },
  {
    firstName: "Lucie",
    lastName: "Moreau",
    birthDate: "1975-11-03",
    sex: "F" as const,
    allergies: [] as string[],
  },
] as const;
