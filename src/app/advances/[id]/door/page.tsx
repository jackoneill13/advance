import { notFound } from "next/navigation";
import { getAdvanceFull, guestAllocation } from "@/lib/queries";
import { AdvanceTabs } from "@/components/AdvanceTabs";
import { PageTitle } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function DoorSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getAdvanceFull(id);
  if (!full) notFound();
  const { advance, venue, artist, party, guests, vehicles } = full;
  const allocation = guestAllocation(venue.specPack, guests, artist.name);
  const byAct = new Map<string, typeof guests>();
  for (const g of guests) byAct.set(g.actName, [...(byAct.get(g.actName) ?? []), g]);
  const byPass = new Map<string, typeof party>();
  for (const m of party) byPass.set(m.passType ?? "Unassigned", [...(byPass.get(m.passType ?? "Unassigned") ?? []), m]);

  return (
    <div className="max-w-2xl">
      <PageTitle
        eyebrow={`${venue.name} · ${fmtDate(advance.showDate)} · doors ${advance.doorsTime ?? "TBD"}`}
        title={`Door sheet: ${advance.title}`}
        right={<PrintButton>Print</PrintButton>}
      />
      <AdvanceTabs id={advance.id} active="door" />

      <section className="mb-6">
        <h2 className="mb-2 text-2xl font-semibold">Credentials</h2>
        {party.length === 0 ? <p className="text-sm text-muted">No roster yet.</p> : null}
        {[...byPass.entries()].map(([pass, members]) => (
          <div key={pass} className="mb-3">
            <h3 className="text-lg font-semibold">
              {pass} <span className="text-sm font-normal text-muted">{members.length}</span>
            </h3>
            <ul className="divide-y divide-line rounded-lg border border-line bg-white text-base">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-3 py-2">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-sm text-body">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-2xl font-semibold">Guest list</h2>
        <p className="mb-2 text-sm text-body">{allocation.map((a) => `${a.act}: ${a.used} of ${a.allowed}`).join(" · ")}</p>
        {guests.length === 0 ? <p className="text-sm text-muted">No names yet.</p> : null}
        {[...byAct.entries()].map(([act, list]) => (
          <div key={act} className="mb-3">
            <h3 className="text-lg font-semibold">{act}</h3>
            <ul className="divide-y divide-line rounded-lg border border-line bg-white text-base">
              {[...list]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((g) => (
                  <li key={g.id} className="flex items-center justify-between px-3 py-2">
                    <span className="font-semibold">
                      {g.name}
                      {g.plusOnes ? <span className="font-normal text-body"> +{g.plusOnes}</span> : null}
                    </span>
                    <span className="text-xs text-muted">{g.late ? "late add · " : ""}{g.addedBy}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-2xl font-semibold">Vehicles</h2>
        {vehicles.length === 0 ? (
          <p className="text-sm text-muted">None listed.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-white text-base">
            {vehicles.map((v) => (
              <li key={v.id} className="px-3 py-2">
                <span className="font-semibold">{v.kind}</span>
                {v.plate ? <span> · plate {v.plate}</span> : null}
                {v.driver ? <span> · {v.driver}</span> : null}
                {v.phone ? <span> · {v.phone}</span> : null}
                {v.arrival ? <span className="block text-sm text-body">Arrives {v.arrival}</span> : null}
                {v.note ? <span className="block text-sm text-body">{v.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
