"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

/** Enrôlement MFA forcé (TOTP). */
export function MfaEnrollClient() {
  const router = useRouter();
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"start" | "verify">("start");

  const startEnroll = async () => {
    setError(null);
    const { data, error: err } = await authClient.twoFactor.enable({
      password,
      method: "totp",
    });
    if (err || !data) {
      setError("Impossible d'activer la MFA. Vérifiez votre mot de passe.");
      return;
    }
    if ("totpURI" in data && data.totpURI) {
      setTotpURI(data.totpURI);
      setBackupCodes(
        "backupCodes" in data && Array.isArray(data.backupCodes) ? data.backupCodes : [],
      );
      const dataUrl = await QRCode.toDataURL(data.totpURI);
      setQr(dataUrl);
      setPhase("verify");
    }
  };

  const verify = async () => {
    setError(null);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, "") });
    if (err) {
      setError("Code invalide.");
      return;
    }
    router.push("/tableau-de-bord");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-extrabold">Activer la double authentification</h1>
      <p className="text-muted-foreground text-sm">
        La MFA TOTP est obligatoire avant tout accès aux dossiers. Conservez vos codes de secours
        hors ligne.
      </p>

      {phase === "start" ? (
        <>
          <Label htmlFor="pwd">Mot de passe actuel</Label>
          <Input
            id="pwd"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="button" onClick={() => void startEnroll()}>
            Générer le QR code
          </Button>
        </>
      ) : (
        <>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code TOTP" className="mx-auto size-48" />
          ) : null}
          {totpURI ? (
            <p className="text-muted-foreground text-xs break-all">
              URI TOTP (secours) : {totpURI}
            </p>
          ) : null}
          {backupCodes.length > 0 ? (
            <div className="bg-muted rounded-xl p-3 text-sm">
              <p className="font-bold">Codes de secours (à conserver) :</p>
              <ul className="mt-2 font-mono text-xs">
                {backupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Label htmlFor="code">Code à 6 chiffres</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="button" onClick={() => void verify()}>
            Valider et continuer
          </Button>
        </>
      )}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
