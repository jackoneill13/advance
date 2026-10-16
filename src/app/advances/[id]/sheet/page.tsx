import { notFound } from "next/navigation";
import { getAdvanceFull } from "@/lib/queries";
import { AdvanceTabs } from "@/components/AdvanceTabs";
import { PageTitle, STATE_LABEL, humanCategory } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { fmtDate } from "@/lib/time";
import type { LineItem } from "@/db/schema";

export const dynamic = "force-dynamic";

function outcome(it: LineItem): string {
  if (it.state === "met") return "Provided (house)";
  if (it.state === "rule") return "Noted";
  if (it.state === "declined") return "Declined";
  if (it.state === "ask_artist") return it.artistAnswer ? `Artist: ${it.artistAnswer}` : "Awaiting artist";
  if (!it.decision) return "Open";
  const base = it.decision === "accept" ? "Provided" : it.decision === "substitute" ? `Substituted${it.suggestedSubstitute ? `: ${it.suggestedSubstitute}` : ""}` : "Declined";
  const note = it.decisionNote ? ` — ${it.decisionNote}` : "";
  const tm = it.tmApprovalRequired && it.decision !== "accept" ? (it.tmApproved ? " (artist approved)" : " (artist sign-off pending)") : "";
  return `${base}${note}${tm}`;
}

export default async function AdvanceSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getAdvanceFull(id);
  if (!full) notFound();
  const { advance, venue, artist, items, party, vehicles } = full;

  const byCategory = new Map<string, LineItem[]>();
  for (const it of items) byCategory.set(it.category, [...(byCategory.get(it.category) ?? []), it]);
  const shopping = items.filter((it) => (it.category === "food_beverage" || it.category === "hospitality") && it.state === "venue_decides" && it.decision === "accept");
  const rentals = items.filter((it) => (it.category === "backline" || it.category === "dj_equipment" || it.category === "staging" || it.category === "monitors_iem") && it.decision && it.decision !== "decline" && it.costNote);

  return (
    <div className="max-w-3xl">
      <PageTitle
        eyebrow={`${venue.name} · ${fmtDate(advance.showDate)} · doors ${advance.doorsTime ?? "TBD"} · ${advance.status}`}
        title={`Advance sheet: ${advance.title}`}
        right={<PrintButton>Print / save PDF</PrintButton>}
      />
      <AdvanceTabs id={advance.id} active="sheet" />

      <p className="mb-6 text-sm text-body">
        Artist: <b>{artist.name}</b>
        {artist.agency ? ` (${artist.agency})` : ""} · Party: {party.length || "not yet provided"} · Vehicles: {vehicles.length || "none listed"}
      </p>

      {shopping.length ? (
        <section className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold">Hospitality order</h2>
          <ul className="list-disc pl-5 text-sm">
            {shopping.map((it) => (
              <li key={it.id}>
                {it.quantity ? `${it.quantity} ` : ""}
                {it.text}
                {it.decisionNote ? ` — ${it.decisionNote}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rentals.length ? (
        <section className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold">Rentals and labor</h2>
          <ul className="list-disc pl-5 text-sm">
            {rentals.map((it) => (
              <li key={it.id}>
                {it.text} — {it.costNote}
                {it.decisionNote ? ` — ${it.decisionNote}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {[...byCategory.entries()].map(([cat, list]) => (
        <section key={cat} className="mb-6 break-inside-avoid">
          <h2 className="mb-2 text-xl font-semibold">{humanCategory(cat)}</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {list.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="w-2/3 py-1.5 pr-3">
                    {it.quantity ? <b>{it.quantity} </b> : null}
                    {it.text}
                    {it.spec ? <span className="text-body"> — {it.spec}</span> : null}
                    <span className="block text-xs text-muted">{STATE_LABEL[it.state]}{it.page ? ` · p.${it.page}` : ""}</span>
                  </td>
                  <td className="py-1.5">{outcome(it)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
