"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getTournament, isBestOfThree, type TournamentData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { parseSets } from "@/lib/format";
import {
  BYE,
  bracketSeeds,
  bracketSize,
  composeF2,
  homeCounts,
  scheduleRoundRobin,
  snakeGroups,
  validateBestOfThree,
  validateNineGame,
  weekForBracketRound,
  weekForGroupRound,
  type Match,
  type ResultType,
} from "@/lib/tournament";

type Supa = ReturnType<typeof createClient>;

// ---------------------------------------------------------------- utilità
function back(path: string, msg: string, error = false): never {
  revalidatePath("/", "layout");
  redirect(`${path}?${error ? "err" : "msg"}=${encodeURIComponent(msg)}`);
}
const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === null ? null : Number(v.replace(",", "."));
};

/**
 * Allinea le righe partita dei tabelloni allo stato calcolato (art. 7):
 * crea le partite appena entrambi i giocatori sono noti, e le azzera se un risultato a monte è stato corretto.
 */
async function syncBrackets(supabase: Supa, data?: TournamentData) {
  const d = data ?? (await getTournament(supabase));
  for (const phase of ["W", "C"] as const) {
    const size = bracketSize(d.seeds[phase].length);
    for (const round of d.brackets[phase]) {
      for (const bm of round) {
        const real = (x: string | null) => x !== null && x !== BYE;
        const existing = d.matches.find((m) => m.phase === phase && m.round === bm.round && m.slot === bm.slot);
        if (!real(bm.home) || !real(bm.away)) {
          if (existing && existing.status === "scheduled") await supabase.from("matches").delete().eq("id", existing.id);
          continue;
        }
        const week = weekForBracketRound(d.schedule, size, bm.round, d.settings.finals_day);
        if (!existing) {
          await supabase.from("matches").insert({
            phase, group_code: null, round: bm.round, slot: bm.slot, home_id: bm.home, away_id: bm.away,
            week_start: week?.start ?? null, week_end: week?.end ?? null,
          });
        } else if (existing.home_id !== bm.home || existing.away_id !== bm.away) {
          await supabase.from("matches").update({
            home_id: bm.home, away_id: bm.away, result_type: null, home_games: null, away_games: null, sets: null,
            status: "scheduled", updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
        }
      }
    }
  }
}

async function createRoundRobin(supabase: Supa, d: TournamentData, phase: "F1" | "F2", groups: Record<string, string>) {
  const byGroup: Record<string, string[]> = {};
  Object.entries(groups).forEach(([id, g]) => (byGroup[g] = [...(byGroup[g] ?? []), id]));
  // ordine di slot: per seed (F1) o per classifica unica (F2)
  const rank = phase === "F1"
    ? new Map(d.players.map((p) => [p.id, -(p.seed_score ?? 0)]))
    : new Map(d.overall.map((r) => [r.player_id, r.overall]));
  // casa/trasferta (art. 4.1): max 2 di fila, metà partite in casa, compensazione rispetto alla Fase 1
  // e sorteggio per decidere chi riceve la partita in casa in più
  const prior = phase === "F2" ? homeCounts(d.matches.filter((m) => m.phase === "F1")) : { priorHome: {}, priorGames: {} };
  const draw = Object.fromEntries(Object.keys(groups).map((id) => [id, Math.random()]));
  const rows: Partial<Match>[] = [];
  for (const [g, ids] of Object.entries(byGroup)) {
    ids.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    scheduleRoundRobin(ids, { ...prior, draw }).forEach((p, i) => {
      const week = weekForGroupRound(d.schedule, phase, p.round);
      rows.push({
        phase, group_code: g, round: p.round, slot: i + 1, home_id: p.home, away_id: p.away,
        week_start: week?.start ?? null, week_end: week?.end ?? null, status: "scheduled",
      });
    });
  }
  if (rows.length) {
    const { error } = await supabase.from("matches").insert(rows);
    if (error) throw new Error(error.message);
  }
}

// ---------------------------------------------------------------- giocatori
export async function savePlayer(f: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const id = str(f, "id");
  const row = {
    full_name: str(f, "full_name") ?? "",
    level: num(f, "level"),
    fitp_rank: str(f, "fitp_rank"),
    seed_score: num(f, "seed_score"),
    status: str(f, "status") ?? "active",
    fee_paid: f.get("fee_paid") === "on",
    lot_f1: num(f, "lot_f1"),
    lot_f2: num(f, "lot_f2"),
    f1_group: str(f, "f1_group")?.toUpperCase() ?? null,
    f2_group: str(f, "f2_group")?.toUpperCase() ?? null,
  };
  if (!row.full_name) back("/admin/giocatori", "Il nome è obbligatorio.", true);
  const res = id
    ? await supabase.from("players").update(row).eq("id", id).select("id").single()
    : await supabase.from("players").insert(row).select("id").single();
  if (res.error) back("/admin/giocatori", res.error.message, true);
  const email = str(f, "email")?.toLowerCase() ?? null;
  const phone = str(f, "phone");
  if (email || phone) {
    const c = await supabase.from("player_contacts").upsert({ player_id: res.data!.id, email, phone });
    if (c.error) back("/admin/giocatori", c.error.message, true);
  }
  back("/admin/giocatori", `Giocatore «${row.full_name}» salvato.`);
}

export async function deletePlayer(f: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("players").delete().eq("id", str(f, "id")!);
  if (error) back("/admin/giocatori", error.message, true);
  back("/admin/giocatori", "Giocatore eliminato.");
}

// ---------------------------------------------------------------- fasi
export async function generateF1(f: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const d = await getTournament(supabase);
  const played = d.matches.some((m) => m.phase === "F1" && m.status !== "scheduled");
  if (played && f.get("confirm") !== "on") back("/admin/fasi", "Ci sono già risultati di Fase 1: spunta la conferma per rigenerare.", true);
  const groups = snakeGroups(d.players);
  await supabase.from("matches").delete().eq("phase", "F1");
  await supabase.from("players").update({ f1_group: null }).not("id", "is", null);
  for (const [id, g] of Object.entries(groups)) await supabase.from("players").update({ f1_group: g }).eq("id", id);
  const fresh = await getTournament(supabase);
  await createRoundRobin(supabase, fresh, "F1", groups);
  back("/admin/fasi", `Fase 1 generata: ${new Set(Object.values(groups)).size} gironi, ${Object.keys(groups).length} giocatori.`);
}

export async function generateF2(f: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const d = await getTournament(supabase);
  const pending = d.matches.filter((m) => m.phase === "F1" && m.status !== "confirmed").length;
  if (pending && f.get("confirm") !== "on")
    back("/admin/fasi", `Mancano ${pending} partite di Fase 1 confermate: spunta la conferma per procedere comunque.`, true);
  const groups = composeF2(d.overall.map((r) => r.player_id));
  await supabase.from("matches").delete().eq("phase", "F2");
  await supabase.from("players").update({ f2_group: null }).not("id", "is", null);
  for (const [id, g] of Object.entries(groups)) await supabase.from("players").update({ f2_group: g }).eq("id", id);
  const fresh = await getTournament(supabase);
  await createRoundRobin(supabase, fresh, "F2", groups);
  back("/admin/fasi", "Fase 2 generata: girone A = metà alta della classifica unica, girone B = metà bassa.");
}

export async function generateBrackets(f: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const d = await getTournament(supabase);
  const pending = d.matches.filter((m) => m.phase === "F2" && m.status !== "confirmed").length;
  if (pending && f.get("confirm") !== "on")
    back("/admin/fasi", `Mancano ${pending} partite di Fase 2 confermate: spunta la conferma per procedere comunque.`, true);
  const { winners, challenger } = bracketSeeds(d.f2.A ?? [], d.f2.B ?? [], d.settings.winners_size, d.settings.promoted_from_b);
  await supabase.from("matches").delete().in("phase", ["W", "C"]);
  await supabase.from("bracket_seeds").delete().in("phase", ["W", "C"]);
  const seedRows = [
    ...winners.map((player_id, i) => ({ phase: "W", seed: i + 1, player_id })),
    ...challenger.map((player_id, i) => ({ phase: "C", seed: i + 1, player_id })),
  ];
  if (seedRows.length) await supabase.from("bracket_seeds").insert(seedRows);
  await syncBrackets(supabase);
  back("/admin/fasi", `Tabelloni generati: Winners ${winners.length}, Challenger ${challenger.length}.`);
}

export async function recomputeDates() {
  await requireAdmin();
  const supabase = createClient();
  const d = await getTournament(supabase);
  for (const m of d.matches) {
    const week =
      m.phase === "F1" || m.phase === "F2"
        ? weekForGroupRound(d.schedule, m.phase, m.round)
        : weekForBracketRound(d.schedule, bracketSize(d.seeds[m.phase].length), m.round, d.settings.finals_day);
    if (week) await supabase.from("matches").update({ week_start: week.start, week_end: week.end }).eq("id", m.id);
  }
  back("/admin/fasi", "Date delle partite ricalcolate dal calendario.");
}

// ---------------------------------------------------------------- partite
export async function saveMatch(f: FormData) {
  const viewer = await requireAdmin();
  const supabase = createClient();
  const d = await getTournament(supabase);
  const id = str(f, "id")!;
  const m = d.matches.find((x) => x.id === id);
  if (!m) back("/admin/partite", "Partita non trovata.", true);
  const resultType = (str(f, "result_type") ?? null) as ResultType | null;
  const status = (str(f, "status") ?? "confirmed") as Match["status"];
  const update: Partial<Match> & Record<string, unknown> = {
    result_type: resultType,
    status: resultType ? status : "scheduled",
    home_games: null,
    away_games: null,
    sets: null,
    notes: str(f, "notes"),
    week_start: str(f, "week_start"),
    week_end: str(f, "week_end"),
    updated_at: new Date().toISOString(),
  };
  if (resultType === "played") {
    if (isBestOfThree(m!, d)) {
      const sets = parseSets(str(f, "sets"));
      const v = validateBestOfThree(sets ?? []);
      if (!v.ok) back("/admin/partite", v.error!, true);
      update.sets = sets;
    } else {
      const h = num(f, "home_games") ?? -1;
      const a = num(f, "away_games") ?? -1;
      const v = validateNineGame(h, a, f.get("retired") === "on");
      if (!v.ok) back("/admin/partite", v.error!, true);
      update.home_games = h;
      update.away_games = a;
    }
  }
  if (update.status === "confirmed") {
    update.confirmed_by = viewer.userId;
    update.confirmed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("matches").update(update).eq("id", id);
  if (error) back("/admin/partite", error.message, true);
  if (m!.phase === "W" || m!.phase === "C") await syncBrackets(supabase);
  back(`/admin/partite`, "Partita aggiornata.");
}

// ---------------------------------------------------------------- segnalazioni
export async function reviewReport(f: FormData) {
  const viewer = await requireAdmin();
  const supabase = createClient();
  const id = str(f, "id")!;
  const approve = str(f, "decision") === "approve";
  const { data: rep } = await supabase.from("result_reports").select("*").eq("id", id).single();
  if (!rep) back("/admin/segnalazioni", "Segnalazione non trovata.", true);
  const now = new Date().toISOString();
  await supabase.from("result_reports").update({ status: approve ? "approved" : "rejected", reviewed_by: viewer.userId, reviewed_at: now }).eq("id", id);
  if (approve) {
    await supabase.from("matches").update({
      home_games: rep.home_games, away_games: rep.away_games, sets: rep.sets, result_type: "played",
      status: "confirmed", confirmed_by: viewer.userId, confirmed_at: now, updated_at: now,
    }).eq("id", rep.match_id);
  } else {
    const { count } = await supabase.from("result_reports").select("id", { count: "exact", head: true })
      .eq("match_id", rep.match_id).eq("status", "pending");
    if (!count) {
      await supabase.from("matches").update({
        home_games: null, away_games: null, sets: null, result_type: null, status: "scheduled", updated_at: now,
      }).eq("id", rep.match_id).eq("status", "reported");
    }
  }
  await syncBrackets(supabase);
  back("/admin/segnalazioni", approve ? "Risultato confermato." : "Segnalazione respinta.");
}

// ---------------------------------------------------------------- impostazioni
export async function saveSettings(f: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const row = {
    name: str(f, "name"),
    start_date: str(f, "start_date"),
    pause_weeks: num(f, "pause_weeks"),
    f1_max_group_size: num(f, "f1_max_group_size"),
    recovery_weeks_f1: num(f, "recovery_weeks_f1"),
    recovery_weeks_f2: num(f, "recovery_weeks_f2"),
    winners_size: num(f, "winners_size"),
    promoted_from_b: num(f, "promoted_from_b"),
    finals_day: str(f, "finals_day"),
    registration_close: str(f, "registration_close"),
    f1_groups_publication: str(f, "f1_groups_publication"),
    f2_groups_publication: str(f, "f2_groups_publication"),
    count_reported_results: f.get("count_reported_results") === "on",
    rules_summary: str(f, "rules_summary") ?? "",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("settings").upsert({ id: 1, ...row });
  if (error) back("/admin/impostazioni", error.message, true);
  back("/admin/impostazioni", "Impostazioni salvate. Se hai cambiato date o formula, ricalcola le date delle partite in «Fasi».");
}

export async function uploadRules(f: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) back("/admin/impostazioni", "Seleziona un PDF.", true);
  const path = `regolamento-${Date.now()}.pdf`;
  const up = await supabase.storage.from("documents").upload(path, file as File, { contentType: "application/pdf" });
  if (up.error) back("/admin/impostazioni", up.error.message, true);
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  await supabase.from("settings").update({ rules_pdf_url: data.publicUrl }).eq("id", 1);
  back("/admin/impostazioni", "Regolamento PDF aggiornato.");
}

export async function saveAdminEmail(f: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const email = str(f, "email")?.toLowerCase();
  if (!email) back("/admin/impostazioni", "Email mancante.", true);
  if (str(f, "op") === "remove") await supabase.from("admin_emails").delete().eq("email", email!);
  else await supabase.from("admin_emails").upsert({ email });
  // allinea il ruolo se l'utente è già registrato
  await supabase.from("profiles").update({ role: str(f, "op") === "remove" ? "player" : "admin" }).eq("email", email!);
  back("/admin/impostazioni", "Elenco admin aggiornato.");
}
