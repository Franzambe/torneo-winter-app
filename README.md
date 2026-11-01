# Torneo Winter · Tennis Alumni Club POLIMI GSoM

Web app per gestire il **1° Torneo Winter Alumni POLIMI GSoM** secondo il regolamento ufficiale v4: 16 giocatori, gironi di qualificazione, gironi A/B per fasce di livello, tabelloni **Winners** e **Challenger**.

- **Pubblico:** home con countdown alle scadenze, classifiche, calendario, tabelloni, download PDF.
- **Giocatore** (login via email): le proprie partite, i contatti dell'avversario, l'inserimento del risultato.
- **Admin** (Founders): giocatori, generazione delle fasi, correzione di risultati e tavolini, validazione delle segnalazioni, impostazioni e regolamento.

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase** (Auth, Postgres con Row Level Security, Storage). Hosting gratuito: **Vercel** (app) + **Supabase** (database), entrambi nel piano free.

---

## Struttura

```
├── middleware.ts                    # sessione + protezione /area-giocatore e /admin
├── supabase/
│   ├── schema.sql                   # tabelle, trigger, policy RLS, bucket documenti
│   └── seed.sql                     # impostazioni v4, email admin, 11 iscritti confermati
├── public/
│   ├── logo.jpg
│   └── docs/regolamento.pdf         # regolamento v4
└── src/
    ├── lib/
    │   ├── tournament/              # LOGICA DEL REGOLAMENTO (TypeScript puro, testato)
    │   │   ├── types.ts             # modello dati e impostazioni di default
    │   │   ├── roundRobin.ts        # gironi all'italiana (Berger, riposo nei gironi dispari)
    │   │   ├── groups.ts            # serpentina F1 (art. 2.2) e fasce F2 (art. 2.4)
    │   │   ├── standings.ts         # classifiche, tiebreak, ritiri (art. 6, 8.3)
    │   │   ├── overall.ts           # classifica unica di Fase 1 (art. 6.3)
    │   │   ├── bracket.ts           # seed, incroci, bye, doppio tavolino (art. 7)
    │   │   ├── validation.ts        # punteggi 9 game / 2 set su 3 (art. 5)
    │   │   ├── calendar.ts          # settimane, pausa natalizia, date chiave (art. 3, 4.8, A.5)
    │   │   └── __tests__/           # 21 test (Vitest)
    │   ├── supabase/                # client server/browser/middleware
    │   ├── data.ts                  # carica i dati e calcola classifiche, calendario, tabelloni
    │   ├── auth.ts                  # utente corrente e ruolo (RBAC)
    │   └── format.ts                # date e punteggi in italiano
    ├── components/                  # Nav, StandingsTable, BracketView, MatchTable, Countdown, ResultForm, PdfExport
    └── app/
        ├── page.tsx                 # Home / dashboard pubblica
        ├── classifiche/             # Fase 1 (gironi + classifica unica) e Fase 2
        ├── calendario/              # settimane e partite per fase
        ├── tabelloni/               # Winners e Challenger
        ├── download/                # regolamento PDF + PDF di calendario e classifiche
        ├── area-giocatore/          # partite personali e inserimento risultato
        ├── login/, auth/            # accesso con link via email
        └── admin/                   # panoramica, giocatori, fasi, partite, segnalazioni, impostazioni
```

## Dove sono le regole nel codice

| Regolamento | Regola | Codice |
|---|---|---|
| 2.1, A.1 | Gironi F1 da 4, eventualmente da 3, mai da 5 | `groups.ts › f1GroupCount` |
| 2.2 | Distribuzione a serpentina per seeding | `groups.ts › snakeGroups` |
| 2.4, A.2 | Girone A = metà alta della classifica unica | `groups.ts › composeF2` |
| 2.5–2.6, 7, A.3–A.4 | Winners = primi 6 di A + primi 2 di B; incroci A1-B2, A4-A5, A2-B1, A3-A6 | `bracket.ts › bracketSeeds, buildBracket` |
| 3, 4.8, A.5 | Calendario, pausa natalizia, proroghe, date chiave | `calendar.ts › buildSchedule` |
| 5.2, 5.5, 5.9 | 9 game, tie-break 8-8, limite 60′, ritiro | `validation.ts › validateNineGame` |
| 5.6 | Semifinali e finali 2 set su 3 con super tie-break | `validation.ts › validateBestOfThree` |
| 6.1–6.2 | Punti, scontro diretto, avulsa con ripartenza, diff. game, sorteggio | `standings.ts › computeGroupStandings` |
| 6.3 | Classifica unica F1 con medie | `overall.ts › overallF1` |
| 7.3 / 7.5 | Bye e doppio tavolino nel tabellone | `bracket.ts › decideWinner` |
| 8.1 | Tavolino 9-0, doppio tavolino 0-9 | `standings.ts › outcomeOf` |
| 8.3 | Ritiro: sotto metà annullate, altrimenti 9-0 agli avversari | `standings.ts › applyWithdrawals` |

La logica è indipendente da React e dal database. Si verifica con `npm test`: i test controllano anche le date del regolamento per 16 e per 18 iscritti.

## Ruoli e sicurezza (RBAC)

| | Anonimo | Giocatore | Admin |
|---|---|---|---|
| Classifiche, calendario, tabelloni, download | ✓ | ✓ | ✓ |
| Contatti degli altri giocatori | — | ✓ | ✓ |
| Segnalare il risultato delle **proprie** partite non confermate | — | ✓ | ✓ |
| Modificare giocatori, partite, fasi, impostazioni, regolamento | — | — | ✓ |

La sicurezza vale anche se qualcuno chiama le API direttamente, perché è applicata a tre livelli:
1. **Policy RLS di Postgres** (`schema.sql`): un giocatore può solo inserire una segnalazione su una partita in cui gioca, finché non è confermata.
2. **Middleware**: blocca l'accesso alle pagine `/admin` a chi non è admin.
3. **`requireAdmin()`**: controlla il ruolo all'inizio di ogni Server Action.

I ruoli si assegnano così:
- un utente diventa **admin** se la sua email è nella tabella `admin_emails`;
- un utente diventa **giocatore** se la sua email coincide con quella registrata nella scheda di un iscritto.

Il collegamento è automatico al primo accesso.

**Flusso dei risultati (art. 4.7).** Il giocatore inserisce il punteggio, che viene validato secondo l'art. 5. La partita passa allo stato «da confermare» e conta subito in classifica (si può disattivare nelle impostazioni). L'admin conferma o respinge la segnalazione. Nei tabelloni il vincitore avanza automaticamente al turno successivo.

---

## Installazione (circa 20 minuti)

### 1. Supabase
1. Crea un progetto su [supabase.com](https://supabase.com) (piano free).
2. **SQL Editor**: esegui `supabase/schema.sql`, poi `supabase/seed.sql`. Prima di eseguirlo, in `seed.sql` sostituisci le email `founderN@example.com` con quelle reali dei Founders.
3. **Authentication › URL Configuration**:
   - *Site URL* = l'URL dell'app (es. `https://torneo-winter.vercel.app`);
   - aggiungi `https://torneo-winter.vercel.app/auth/callback` e `http://localhost:3000/auth/callback` ai *Redirect URLs*.
4. **Project Settings › API**: copia *Project URL* e *anon public key*.

### 2. In locale
```bash
cp .env.example .env.local   # incolla URL e anon key
npm install
npm run dev                  # http://localhost:3000
npm test                     # test del regolamento
```

### 3. GitHub + Vercel
1. Crea un repository su GitHub e carica il progetto (`git init && git add . && git commit -m "Torneo Winter" && git push`). Ad ogni push la GitHub Action in `.github/workflows/ci.yml` esegue typecheck, test e build.
2. Su [vercel.com](https://vercel.com) scegli **Add New › Project**, importa il repository e aggiungi le variabili `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`.
3. Deploy. Ogni push sul branch `main` pubblica automaticamente la nuova versione.

## Uso durante il torneo

1. **Giocatori:** in *Admin › Giocatori* inserisci email (serve per l'accesso), cellulare, livello e **punteggio di seeding**. Gli 11 confermati sono già caricati.
2. **15/11 — Fase 1:** in *Admin › Fasi* clicca *Genera gironi e calendario F1*. Le settimane vengono assegnate automaticamente.
3. **Durante le fasi:** i giocatori inseriscono i risultati e tu li confermi in *Segnalazioni*. Tavolini, ritiri (stato del giocatore) e correzioni si gestiscono in *Partite* e *Giocatori*.
4. **03/01 — Fase 2:** *Genera gironi e calendario F2*. La classifica unica di Fase 1 decide i gironi A e B.
5. **14/03 — Tabelloni:** *Genera tabelloni*. I seed vengono congelati e il tabellone avanza da solo con i risultati.
6. **Parità assolute:** il simbolo ⚑ in classifica segnala una parità che va sorteggiata. Il Comitato esegue il sorteggio e inserisce l'esito nel campo «Sorteggio F1/F2» della scheda giocatore (più alto = meglio).

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm test` | test della logica del regolamento |
| `npm run typecheck` | controllo dei tipi TypeScript |
| `npm run build` | build di produzione |
