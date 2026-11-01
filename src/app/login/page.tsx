"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Accesso senza password: link via email (Supabase magic link). */
export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const next = new URLSearchParams(window.location.search).get("next") ?? "/area-giocatore";
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message);
      setState("error");
    } else setState("sent");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h1">Accedi</h1>
        <p className="muted mt-1">Usa l&apos;email con cui ti sei iscritto al torneo: riceverai un link di accesso.</p>
        {state === "sent" ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Controlla la posta: ti abbiamo inviato il link di accesso a {email}.</p>
        ) : (
          <form onSubmit={send} className="mt-4 space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" className="input" />
            <button className="btn w-full" disabled={state === "sending"}>{state === "sending" ? "Invio…" : "Invia link di accesso"}</button>
            {state === "error" && <p className="text-sm text-red-700">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
