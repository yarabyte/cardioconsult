import type { Metadata } from "next";
import { connection } from "next/server";
import { Plus_Jakarta_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: `${APP_TAGLINE} — comptes rendus, scores, surveillance.`,
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rendu dynamique obligatoire : Next injecte le nonce CSP (lu depuis l’en-tête
  // Content-Security-Policy de la requête, posé par proxy.ts) sur les scripts.
  // Un HTML pré-rendu + nonce frais par requête bloque toute hydratation.
  await connection();

  return (
    <html lang="fr" className={`${plusJakarta.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
