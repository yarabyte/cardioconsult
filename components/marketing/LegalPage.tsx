import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <Logo variant="clair" width={160} height={40} />
          </Link>
          <Link href="/" className="text-primary text-sm font-bold">
            Accueil
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <div className="text-foreground/90 mt-8 space-y-4 text-[15px] leading-relaxed">
          {children}
        </div>
        <p className="text-muted-foreground mt-10 text-xs">
          Contenu juridique non finalisé — marqueurs destinés au juriste / DPO.
        </p>
      </main>
    </div>
  );
}

export function Juriste({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-warning-soft text-warning rounded px-1 font-semibold">
      [À COMPLÉTER PAR LE JURISTE] {children}
    </span>
  );
}
