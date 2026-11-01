"use client";

import { useEffect, useState } from "react";

/** Countdown alla prossima scadenza (fine giornata 23:59 ora italiana). */
export function Countdown({ date, label }: { date: string; label: string }) {
  const target = new Date(`${date}T23:59:00+01:00`).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - (now ?? target));
  const parts = [
    ["giorni", Math.floor(diff / 86400000)],
    ["ore", Math.floor(diff / 3600000) % 24],
    ["min", Math.floor(diff / 60000) % 60],
    ["sec", Math.floor(diff / 1000) % 60],
  ] as const;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-white/70">Prossima scadenza</div>
      <div className="mt-1 text-lg font-semibold">{label}</div>
      <div className="mt-3 flex gap-3">
        {parts.map(([u, v]) => (
          <div key={u} className="min-w-[64px] rounded-lg bg-white/10 px-3 py-2 text-center">
            <div className="text-2xl font-bold tabular-nums">{now === null ? "–" : String(v).padStart(2, "0")}</div>
            <div className="text-[11px] uppercase text-white/70">{u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
