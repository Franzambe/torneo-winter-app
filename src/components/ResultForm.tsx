import { submitResult } from "@/app/area-giocatore/actions";

/**
 * Inserimento risultato dal punto di vista del giocatore («io – avversario»).
 * Partite a 9 game (art. 5.2/5.5/5.9) oppure 2 set su 3 per semifinali e finali (art. 5.6).
 */
export function ResultForm({ matchId, opponent, bestOfThree }: { matchId: string; opponent: string; bestOfThree: boolean }) {
  return (
    <form action={submitResult} className="mt-3 space-y-3 rounded-lg bg-club-light/60 p-3">
      <input type="hidden" name="match_id" value={matchId} />
      {bestOfThree ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <span className="label">{i === 3 ? "Super tie-break" : `Set ${i}`} (io – {opponent})</span>
              <div className="flex items-center gap-1">
                <input name={`s${i}_mine`} type="number" min={0} max={i === 3 ? 30 : 7} className="input" required={i < 3} />
                <span>–</span>
                <input name={`s${i}_opp`} type="number" min={0} max={i === 3 ? 30 : 7} className="input" required={i < 3} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="label">I miei game</span>
            <input name="mine" type="number" min={0} max={9} className="input w-20" required />
          </div>
          <div>
            <span className="label">Game di {opponent}</span>
            <input name="opp" type="number" min={0} max={9} className="input w-20" required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="retired" /> ritiro durante la partita (art. 5.9)
          </label>
        </div>
      )}
      <input name="note" placeholder="Note (facoltative): es. finita per limite dei 60 minuti" className="input" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-black/50">Limite dei 60′: vale il punteggio raggiunto (es. 7-5), mai in parità (art. 5.5).</p>
        <button className="btn">Invia risultato</button>
      </div>
    </form>
  );
}
