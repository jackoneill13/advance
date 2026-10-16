import { notFound } from "next/navigation";
import { getAdvanceFull, guestAllocation } from "@/lib/queries";
import { addPartyMember, setPassType, removePartyMember, addGuest, removeGuest, addVehicle, removeVehicle } from "@/app/actions";
import { AdvanceTabs } from "@/components/AdvanceTabs";
import { Card, PageTitle, input, btnGhost, btnPrimary, Empty } from "@/components/ui";
import { PARTY_ROLES } from "@/lib/schemas";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getAdvanceFull(id);
  if (!full) notFound();
  const { advance, venue, artist, party, guests, vehicles } = full;
  const pack = venue.specPack;
  const allocation = guestAllocation(pack, guests, artist.name);
  const passCounts = new Map<string, number>();
  for (const m of party) passCounts.set(m.passType ?? "Unassigned", (passCounts.get(m.passType ?? "Unassigned") ?? 0) + 1);

  return (
    <div>
      <PageTitle eyebrow={`${venue.name} · ${fmtDate(advance.showDate)}`} title={advance.title} />
      <AdvanceTabs id={advance.id} active="people" />

      <section className="mb-8">
        <h2 className="mb-2 text-2xl font-semibold">Touring party</h2>
        <p className="mb-3 text-sm text-body">The artist side fills this from the share link; you can add or correct here. Roles set the default pass.</p>
        <Card>
          {party.length === 0 ? (
            <Empty>No roster yet. The share link asks the tour manager for it.</Empty>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr>
                  <th className="py-1">Name</th>
                  <th>Role</th>
                  <th>Pass</th>
                  <th className="hidden sm:table-cell">Arrival</th>
                  <th className="hidden sm:table-cell">Dietary</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {party.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 font-semibold">
                      {m.name}
                      {m.phone ? <span className="block text-xs font-normal text-muted">{m.phone}</span> : null}
                    </td>
                    <td>{m.role}</td>
                    <td>
                      <form action={setPassType} className="flex items-center gap-1">
                        <input type="hidden" name="advanceId" value={advance.id} />
                        <input type="hidden" name="memberId" value={m.id} />
                        <select name="passType" defaultValue={m.passType ?? ""} className="rounded border border-line bg-white px-1 py-0.5 text-sm">
                          <option value="">Unassigned</option>
                          {pack.passTypes.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <button className="text-xs text-muted underline">set</button>
                      </form>
                    </td>
                    <td className="hidden sm:table-cell">{m.arrival ?? ""}</td>
                    <td className="hidden sm:table-cell">{m.dietary ?? ""}</td>
                    <td className="text-right">
                      <form action={removePartyMember}>
                        <input type="hidden" name="advanceId" value={advance.id} />
                        <input type="hidden" name="memberId" value={m.id} />
                        <button className="text-xs text-declined underline">remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={addPartyMember} className="mt-4 grid gap-2 sm:grid-cols-6">
            <input type="hidden" name="advanceId" value={advance.id} />
            <input name="name" placeholder="Name" required className={`${input} sm:col-span-2`} />
            <select name="role" className={input} defaultValue="Tour manager">
              {PARTY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input name="phone" placeholder="Cell" className={input} />
            <input name="arrival" placeholder="Arrival" className={input} />
            <button className={btnPrimary}>Add</button>
          </form>
          <p className="mt-3 text-xs text-muted">
            Passes: {[...passCounts.entries()].map(([p, n]) => `${p} ${n}`).join(" · ") || "none assigned"}
          </p>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-2xl font-semibold">Guest list</h2>
        <p className="mb-3 text-sm text-body">
          Policy: {pack.compPolicy.headliner} for the headliner, {pack.compPolicy.support} per support act, cutoff {pack.compPolicy.cutoffHoursBeforeDoors} h before
          doors. Late adds are marked and logged with who added them.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {allocation.map((a) => (
            <div key={a.act} className={`rounded-lg border px-3 py-2 ${a.used > a.allowed ? "border-declined bg-declined-bg" : "border-line bg-white"}`}>
              <p className="text-xs text-muted">{a.act}</p>
              <p className="text-lg font-semibold">
                {a.used} / {a.allowed}
              </p>
            </div>
          ))}
        </div>
        <Card>
          {guests.length === 0 ? (
            <Empty>No names yet.</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {guests.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <b>{g.name}</b>
                    {g.plusOnes ? ` +${g.plusOnes}` : ""} <span className="text-muted">· {g.actName}</span>
                    {g.late ? <span className="ml-2 rounded bg-decide-bg px-1.5 text-xs text-decide">late add</span> : null}
                    <span className="block text-xs text-muted">
                      added by {g.addedBy}
                      {g.note ? ` · ${g.note}` : ""}
                    </span>
                  </span>
                  <form action={removeGuest}>
                    <input type="hidden" name="advanceId" value={advance.id} />
                    <input type="hidden" name="guestId" value={g.id} />
                    <button className="text-xs text-declined underline">remove</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addGuest} className="mt-4 grid gap-2 sm:grid-cols-6">
            <input type="hidden" name="advanceId" value={advance.id} />
            <input type="hidden" name="addedBy" value="venue" />
            <input name="actName" placeholder="Act" defaultValue={artist.name} className={`${input} sm:col-span-2`} />
            <input name="name" placeholder="Guest name" required className={`${input} sm:col-span-2`} />
            <input name="plusOnes" type="number" min={0} defaultValue={0} className={input} />
            <button className={btnPrimary}>Add</button>
          </form>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-2xl font-semibold">Vehicles and parking</h2>
        <Card>
          {vehicles.length === 0 ? (
            <Empty>No vehicles yet.</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {vehicles.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <b>{v.kind}</b>
                    {v.plate ? ` · ${v.plate}` : ""}
                    {v.driver ? ` · ${v.driver}` : ""}
                    {v.phone ? ` · ${v.phone}` : ""}
                    {v.arrival ? ` · arrives ${v.arrival}` : ""}
                    {v.note ? <span className="block text-xs text-muted">{v.note}</span> : null}
                  </span>
                  <form action={removeVehicle}>
                    <input type="hidden" name="advanceId" value={advance.id} />
                    <input type="hidden" name="vehicleId" value={v.id} />
                    <button className="text-xs text-declined underline">remove</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addVehicle} className="mt-4 grid gap-2 sm:grid-cols-6">
            <input type="hidden" name="advanceId" value={advance.id} />
            <select name="kind" className={input} defaultValue="Van">
              {["Bus", "Bus + trailer", "Van", "Van + trailer", "Box truck", "Car"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <input name="plate" placeholder="Plate" className={input} />
            <input name="driver" placeholder="Driver" className={input} />
            <input name="phone" placeholder="Driver cell" className={input} />
            <input name="arrival" placeholder="Arrival" className={input} />
            <button className={btnGhost}>Add</button>
          </form>
        </Card>
      </section>
    </div>
  );
}
