"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const schema = z.string().email();

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse(email);
    if (!parsed.success) {
      setError("Adresse e-mail invalide.");
      return;
    }
    // Message identique que l'e-mail existe ou non.
    await authClient.requestPasswordReset({
      email: parsed.data,
      redirectTo: "/connexion/reinitialiser",
    });
    setDone(true);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
      {done ? (
        <p className="text-sm">
          Si un compte correspond, un e-mail a été envoyé. Le lien est valable 30 minutes et à usage
          unique.
        </p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
          <Label htmlFor="email">E-mail professionnel</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit">Envoyer le lien</Button>
        </form>
      )}
      <Link href="/connexion" className="text-primary text-sm font-semibold">
        Retour à la connexion
      </Link>
    </div>
  );
}
