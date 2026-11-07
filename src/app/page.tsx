import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { MatchTable } from "@/components/MatchTable";
import { getTournament } from "@/lib/data";
import { fmtDate, scoreText, todayIso, PHASE_LABEL } from "@/lib/format";
import { nextKeyDate } from "@/lib/tournament";

export default async function Home() {
  const d = await getTournament();
  const today = todayIso();
  const next = nextKeyDate(d.schedule, today);
  const currentWeek = d.schedule.weeks.find((w) => w.monday <= today && w.sunday >= today);
  const latest = d.matches
    .filter((m) => m.status !== "scheduled")
    .sort((a, b) => String((b as { updated_at?: string }).updated_at ?? "").localeCompare(String((a as { updated_at?: string }).updated_at ?? "")))
    .slice(0, 6);
  const summary = (d.settings.rules_summary || "").split("\n").filter(Boolean);
  // incontri della settimana in corso, altrimenti della prossima settimana con partite
  const nowList = d.matches.filter((m) => m.week_start && m.week_end && m.week_start <= today && m.week_end >= today);
  const nextStart = d.matches.map((m) => m.week_start ?? "").filter((x) => x > today).sort()[0];
  const upcoming = nowList.length
    ? { title: "Incontri di questa settimana", list: nowList }
    : { title: nextStart ? `Prossimi incontri · settimana dal ${fmtDate(nextStart)}` : "Prossimi incontri", list: d.matches.filter((m) => m.week_start === nextStart) };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-club-black p-6 text-white sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-widest text-white/60">Tennis Alumni Club POLIMI GSoM</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{d.settings.name}</h1>
            <p className="mt-3 text-white/75">
              {currentWeek ? <>Settimana in corso: <b>{currentWeek.label}</b> ({fmtDate(currentWeek.monday, false)} – {fmtDate(currentWeek.sunday, false)})</> : "Singolare · 3 fasi · Finals Day in primavera"}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/classifiche" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-club-black">Classifiche</Link>
              <Link href="/calendario" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Calendario</Link>
              <Link href="/tabelloni" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Tabelloni</Link>
              <Link href="/area-giocatore" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Inserisci un risultato</Link>
            </div>
          </div>
          {next && <Countdown date={next.date} label={`${next.label} · ${fmtDate(next.date)}`} />}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-3">Il torneo in sintesi</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {summary.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <a href={d.settings.rules_pdf_url ?? "/docs/regolamento.pdf"} className="btn-ghost mt-4" target="_blank">Regolamento completo (PDF)</a>
        </section>

        <section className="card">
          <h2 className="h2 mb-3">Date chiave</h2>
          <table className="table">
            <tbody>
              {d.schedule.keyDates.map((k) => (
                <tr key={k.key} className={k.date < today ? "text-black/40" : next?.key === k.key ? "bg-amber-50 font-semibold" : ""}>
                  <td>{k.label}</td>
                  <td className="whitespace-nowrap">{fmtDate(k.date)}</td>
                  <td className="text-xs text-black/45">art. {k.article}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="h2">{upcoming.title}</h2>
          <Link href="/calendario" className="text-sm underline">Calendario completo</Link>
        </div>
        {upcoming.list.length ? (
          <MatchTable matches={upcoming.list} names={d.names} />
        ) : (
          <p className="muted">Nessun incontro in programma.</p>
        )}
      </section>

      <section className="card">
        <h2 className="h2 mb-3">Ultimi risultati</h2>
        {latest.length === 0 ? (
          <p className="muted">Nessun risultato ancora: si parte il {fmtDate(d.settings.start_date)}.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-sm">
            {latest.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{d.names[m.home_id ?? ""]} – {d.names[m.away_id ?? ""]}</span>
                <span className="font-mono">{scoreText(m)}</span>
                <span className="w-full text-xs text-black/45 sm:w-auto">{PHASE_LABEL[m.phase]}{m.group_code ? ` · girone ${m.group_code}` : ""}{m.status === "reported" ? " · da confermare" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
