import { fmtDate, scoreText } from "@/lib/format";
import { BYE, roundName, type BracketMatch } from "@/lib/tournament";

/** Tabellone a eliminazione diretta: una colonna per turno (art. 7). */
export function BracketView({ title, rounds, names }: { title: string; rounds: BracketMatch[][]; names: Record<string, string> }) {
  if (!rounds.length) return null;
  const label = (id: string | null, seed: number | null) =>
    id === null ? <span className="text-black/35">da definire</span> : id === BYE ? <span className="text-black/35">BYE</span> : (
      <>
        {seed && <span className="mr-1 text-[11px] text-black/45">[{seed}]</span>}
        {names[id] ?? id}
      </>
    );
  return (
    <div className="card">
      <h2 className="h2 mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {rounds.map((round, i) => (
          <div key={i} className="flex min-w-[220px] flex-1 flex-col justify-around gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-club-slate">{roundName(round[0].remaining)}</div>
            {round.map((bm) => {
              const score = bm.match ? scoreText(bm.match) : "";
              return (
                <div key={bm.slot} className="rounded-lg border border-black/10 bg-white text-sm shadow-sm">
                  {(["home", "away"] as const).map((side) => {
                    const id = bm[side];
                    const won = bm.winner && bm.winner === id && id !== BYE;
                    return (
                      <div key={side} className={`flex items-center justify-between px-2 py-1.5 ${side === "home" ? "border-b border-black/5" : ""} ${won ? "font-semibold" : ""}`}>
                        <span className="truncate">{label(id, side === "home" ? bm.homeSeed : bm.awaySeed)}</span>
                        {won && <span className="ml-2 text-club-clay">●</span>}
                      </div>
                    );
                  })}
                  <div className="flex justify-between bg-club-light/60 px-2 py-1 text-[11px] text-black/55">
                    <span>{bm.match?.week_start ? fmtDate(bm.match.week_start, false) : ""}</span>
                    <span className="font-mono">{score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
