"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getTournament, isBestOfThree } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { validateBestOfThree, validateNineGame, type SetScore } from "@/lib/tournament";

function back(msg: string, error = false): never {
  revalidatePath("/", "layout");
  redirect(`/area-giocatore?${error ? "err" : "msg"}=${encodeURIComponent(msg)}`);
}

/**
 * Il giocatore segnala il risultato della propria partita (art. 4.7).
 * Il punteggio è validato secondo l'art. 5; la policy RLS impedisce di segnalare partite altrui o già confermate.
 */
export async function submitResult(f: FormData) {
  const viewer = await getViewer();
  if (!viewer.playerId) back("Il tuo account non è collegato a un giocatore: scrivi al Comitato.", true);
  const supabase = createClient();
  const d = await getTournament(supabase);
  const m = d.matches.find((x) => x.id === f.get("match_id"));
  if (!m) back("Partita non trovata.", true);
  if (![m!.home_id, m!.away_id].includes(viewer.playerId)) back("Puoi inserire solo i risultati delle tue partite.", true);
  if (m!.status === "confirmed") back("Il risultato è già stato confermato dal Comitato.", true);

  // il punteggio si inserisce sempre come "mio - avversario" e qui si riporta a casa-ospite
  const iAmHome = m!.home_id === viewer.playerId;
  let home_games: number | null = null;
  let away_games: number | null = null;
  let sets: SetScore[] | null = null;

  if (isBestOfThree(m!, d)) {
    sets = [1, 2, 3]
      .map((i) => ({ mine: f.get(`s${i}_mine`), opp: f.get(`s${i}_opp`) }))
      .filter((s) => s.mine !== "" && s.opp !== "" && s.mine !== null && s.opp !== null)
      .map((s) => (iAmHome ? { home: Number(s.mine), away: Number(s.opp) } : { home: Number(s.opp), away: Number(s.mine) }));
    const v = validateBestOfThree(sets);
    if (!v.ok) back(v.error!, true);
  } else {
    const mine = Number(f.get("mine"));
    const opp = Number(f.get("opp"));
    [home_games, away_games] = iAmHome ? [mine, opp] : [opp, mine];
    const v = validateNineGame(home_games, away_games, f.get("retired") === "on");
    if (!v.ok) back(v.error!, true);
  }

  const { error } = await supabase.from("result_reports").insert({
    match_id: m!.id,
    home_games,
    away_games,
    sets,
    retired: f.get("retired") === "on",
    note: typeof f.get("note") === "string" && f.get("note") ? String(f.get("note")) : null,
  });
  if (error) back(error.message, true);
  back("Risultato inviato: è visibile in classifica e diventa definitivo dopo la conferma del Comitato.");
}
