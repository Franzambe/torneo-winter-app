"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  pkce: "Il link è stato aperto in un browser diverso da quello in cui l'hai richiesto. Inserisci qui sotto il codice ricevuto via email, oppure richiedi un nuovo link e aprilo sullo stesso dispositivo.",
  link: "Link di accesso non valido o incompleto. Richiedi un nuovo codice.",
  otp_expired: "Il link è scaduto o è già stato usato. Richiedi un nuovo codice.",
};

/**
 * Accesso senza password: codice a 6 cifre via email (funziona su qualsiasi dispositivo) oppure link.
 * Il Comitato (ruolo admin) può entrare anche con email e password: la password si imposta da
 * Supabase › Authentication › Users. Un utente non admin che usa la password viene scollegato.
 */
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [next, setNext] = useState("/area-giocatore");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setNext(q.get("next") ?? "/area-giocatore");
    const h = new URLSearchParams(window.location.hash.slice(1)); // errori restituiti da Supabase nell'hash
    const key = h.get("error_code") ?? q.get("error");
    if (key) setError(ERRORS[key] ?? h.get("error_description") ?? key);
    // se la sessione è già attiva (link aperto correttamente) vai avanti
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) router.replace(q.get("next") ?? "/area-giocatore");
    });
  }, [router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("Codice non valido o scaduto. Controlla l'ultima email ricevuta o richiedine uno nuovo.");
    else {
      router.replace(next);
      router.refresh();
    }
  }

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.user) {
      setBusy(false);
      setError("Email o password non corretti.");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setBusy(false);
      setError("L'accesso con password è riservato al Comitato. Usa il codice via email.");
      return;
    }
    setBusy(false);
    const q = new URLSearchParams(window.location.search);
    router.replace(q.get("next") ?? "/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h1">Accedi</h1>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {step === "password" ? (
          <form onSubmit={loginWithPassword} className="mt-4 space-y-3">
            <p className="muted">Accesso del Comitato con email e password.</p>
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" className="input" />
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input" />
            <button className="btn w-full" disabled={busy}>{busy ? "Accesso…" : "Accedi"}</button>
            <button type="button" className="w-full text-center text-xs text-black/55 underline" onClick={() => { setStep("email"); setPassword(""); setError(""); }}>
              Torna all&apos;accesso con codice via email
            </button>
          </form>
        ) : step === "email" ? (
          <form onSubmit={send} className="mt-4 space-y-3">
            <p className="muted">Usa l&apos;email con cui ti sei iscritto al torneo: riceverai un codice di accesso (e un link).</p>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" className="input" />
            <button className="btn w-full" disabled={busy}>{busy ? "Invio…" : "Inviami il codice"}</button>
            <button type="button" className="w-full text-center text-xs text-black/55 underline" onClick={() => email && setStep("code")}>
              Ho già un codice
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-4 space-y-3">
            <p className="muted">Abbiamo scritto a <b>{email}</b>. Inserisci il codice dell&apos;email (oppure clicca il link, su questo stesso dispositivo).</p>
            <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="input text-center font-mono text-lg tracking-widest" maxLength={8} />
            <button className="btn w-full" disabled={busy || code.length < 6}>{busy ? "Verifica…" : "Accedi"}</button>
            <button type="button" className="w-full text-center text-xs text-black/55 underline" onClick={() => { setStep("email"); setCode(""); }}>
              Cambia email o invia un nuovo codice
            </button>
          </form>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-black/45">Non serve una password. Se non trovi l&apos;email, controlla nella posta indesiderata.</p>
      {step !== "password" && (
        <button type="button" className="mx-auto mt-2 block text-[11px] text-black/35 underline" onClick={() => { setStep("password"); setError(""); }}>
          Accesso Comitato con password
        </button>
      )}
    </div>
  );
}
