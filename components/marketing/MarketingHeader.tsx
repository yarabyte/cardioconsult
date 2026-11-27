"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#courbes", label: "Courbes & suivi" },
  { href: "#securite", label: "Sécurité" },
  { href: "#tarifs", label: "Tarifs" },
] as const;

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,border-color]",
        scrolled
          ? "border-b border-[#DCE4F2] bg-white/95 shadow-[0_8px_30px_rgba(10,31,68,0.06)] backdrop-blur-xl"
          : "border-b border-transparent bg-white/80 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 md:h-[4.25rem] md:gap-5 md:px-8">
        <Link
          href="/"
          className="shrink-0 transition-opacity hover:opacity-90"
          aria-label={`${APP_NAME} — accueil`}
          onClick={() => setOpen(false)}
        >
          <Logo variant="clair" height={36} priority />
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden flex-1 items-center justify-center lg:flex"
        >
          <div className="flex items-center gap-0.5 rounded-full border border-[#E3E9F4] bg-[#F4F7FC]/80 p-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-[13.5px] font-semibold whitespace-nowrap text-[#3E4D6A] transition-colors hover:bg-white hover:text-[#0B4FB3] hover:shadow-sm xl:px-4 xl:text-[14px]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
          <Link
            href="/t/dr-martin/connexion"
            className="hidden rounded-full px-3 py-2 text-[13.5px] font-bold whitespace-nowrap text-[#0B4FB3] transition-colors hover:bg-[#E8F0FB] sm:inline-flex xl:text-[14px]"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className={cn(
              buttonVariants(),
              "h-auto rounded-full bg-[#0B4FB3] px-4 py-2.5 text-[13.5px] font-bold whitespace-nowrap shadow-[0_4px_14px_rgba(11,79,179,0.25)] hover:bg-[#083A85] xl:px-5 xl:text-[14px]",
            )}
          >
            Essai 30 jours
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-[#E3E9F4] bg-white text-[#0A1F44] transition-colors hover:bg-[#F4F7FC] lg:hidden"
            aria-expanded={open}
            aria-controls="marketing-mobile-nav"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="marketing-mobile-nav" className="border-t border-[#E3E9F4] bg-white lg:hidden">
          <nav
            aria-label="Navigation mobile"
            className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4"
          >
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-[15px] font-semibold text-[#0A1F44] transition-colors hover:bg-[#F4F7FC] hover:text-[#0B4FB3]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/t/dr-martin/connexion"
              className="mt-2 rounded-xl px-3 py-3 text-[15px] font-bold text-[#0B4FB3] hover:bg-[#E8F0FB] sm:hidden"
              onClick={() => setOpen(false)}
            >
              Se connecter
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
