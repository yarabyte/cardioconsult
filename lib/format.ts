import { format as formatDateFns, type Locale } from "date-fns";
import { fr } from "date-fns/locale";

export const FR_LOCALE: Locale = fr;
export const TIMEZONE = "Europe/Paris";

/** Format date in French long form: « 23 novembre 2026 ». */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDateFns(d, "d MMMM yyyy", { locale: fr });
}

/** Format date short FR: « 23/11/2026 ». */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDateFns(d, "dd/MM/yyyy", { locale: fr });
}

/** Format datetime FR: « 23/11/2026 10:02 ». */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDateFns(d, "dd/MM/yyyy HH:mm", { locale: fr });
}

/** French number with non-breaking thin space: 1 284 */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("fr-FR", options).format(n);
}

/** Decimal with comma: 1,94 */
export function formatDecimal(n: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/** Age in whole years at a reference date (act date). */
export function ageAt(birthDate: string | Date, at: string | Date): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const ref = typeof at === "string" ? new Date(at) : at;
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function patientDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
