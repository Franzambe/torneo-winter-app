import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="muted mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Messaggi di esito delle Server Actions (?msg= / ?err=). */
export function Flash({ searchParams }: { searchParams?: { msg?: string; err?: string } }) {
  if (searchParams?.err)
    return <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{searchParams.err}</div>;
  if (searchParams?.msg)
    return <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{searchParams.msg}</div>;
  return null;
}

const BADGE: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-700",
  reported: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  W: "bg-club-black text-white",
  C: "bg-club-slate text-white",
};
const BADGE_TEXT: Record<string, string> = {
  scheduled: "da giocare",
  reported: "da confermare",
  confirmed: "confermata",
  W: "Winners",
  C: "Challenger",
};

export function Badge({ kind, text }: { kind: string; text?: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[kind] ?? "bg-gray-100"}`}>
      {text ?? BADGE_TEXT[kind] ?? kind}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted rounded-lg border border-dashed border-black/15 bg-white/60 p-4 text-center">{children}</p>;
}
