"use client";

import { useState } from "react";
import { acceptInvitation } from "@/server/actions/team";
import { Button } from "@/components/ui/button";

export function AcceptInvitationClient({ token }: { token: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAccept() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const r = await acceptInvitation(token);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error.message);
      return;
    }
    setMsg(r.message ?? "Invitation acceptée.");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-extrabold">Invitation équipe</h1>
      <p className="text-muted-foreground text-sm">
        Acceptez uniquement si vous êtes connecté avec l&apos;adresse e-mail invitée. Aucune donnée
        de santé n&apos;est associée à cette étape.
      </p>
      <Button type="button" disabled={busy} onClick={() => void onAccept()}>
        Accepter l&apos;invitation
      </Button>
      {msg ? <p className="text-success text-sm font-bold">{msg}</p> : null}
      {err ? <p className="text-destructive text-sm font-bold">{err}</p> : null}
    </div>
  );
}
