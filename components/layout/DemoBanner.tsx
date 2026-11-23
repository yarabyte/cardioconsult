import { MOCK_ACTIVE } from "@/lib/data/delay";

export function DemoBanner() {
  if (!MOCK_ACTIVE) return null;
  return (
    <div
      role="status"
      className="bg-warning-soft text-warning border-b border-[#F5E0B8] px-4 py-1.5 text-center text-xs font-semibold"
    >
      Données fictives — aucune donnée de santé réelle
    </div>
  );
}
