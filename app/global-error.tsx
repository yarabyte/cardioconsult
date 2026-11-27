"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Erreur fatale au-dessus du root layout : html/body propres obligatoires.
 * Styles inline minimaux pour rester lisible même si le thème échoue.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? "global-error");
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
          background: "#F4F7FC",
          color: "#0A1F44",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#0B4FB3",
            }}
          >
            Erreur
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: 28, fontWeight: 800 }}>
            Cardio Soin indisponible
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.5, color: "#52627F" }}>
            Une erreur critique empêche l’affichage. Réessayez. Si le problème continue, contactez
            le support avec la référence technique (aucune donnée patient).
          </p>
          {error.digest ? (
            <p
              style={{
                margin: "16px 0 0",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                color: "#52627F",
              }}
            >
              Réf. technique&nbsp;: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              height: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: "#0B4FB3",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
