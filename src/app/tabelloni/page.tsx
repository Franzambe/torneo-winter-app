import { BracketView } from "@/components/BracketView";
import { Empty, PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export default async function Tabelloni() {
  const d = await getTournament();
  const qa = d.settings.winners_size - d.settings.promoted_from_b;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tabelloni finali"
        subtitle={`Eliminazione diretta. Quarti a 9 game; semifinali e finali 2 set su 3 con super tie-break. Finals Day: ${fmtDate(d.settings.finals_day)} (art. 3.3, 7).`}
      />
      {d.brackets.W.length === 0 ? (
        <Empty>I tabelloni saranno pubblicati al termine della Fase 2. Winners: primi {qa} del girone A e primi {d.settings.promoted_from_b} del girone B; Challenger: tutti gli altri.</Empty>
      ) : (
        <>
          <BracketView title="Tabellone Winners" rounds={d.brackets.W} names={d.names} />
          <BracketView title="Tabellone Challenger" rounds={d.brackets.C} names={d.names} />
        </>
      )}
    </div>
  );
}
