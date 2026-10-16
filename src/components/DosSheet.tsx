import type { AdvanceFull } from "@/lib/queries";
import { SCHEDULE_SLOTS } from "@/lib/schemas";
import { fmtTime, toMinutes } from "@/lib/scheduler";
import { fmtDate } from "@/lib/time";
import { humanCategory } from "./ui";

/**
 * The printed day-of-show sheet. Pure render: the venue console and the artist link
 * both use it, with `audience` deciding whether venue-internal details (staff cells, costs) show.
 */
export function DosSheet({ full, audience }: { full: AdvanceFull; audience: "venue" | "artist" }) {
  const { advance, venue, artist, items, party, vehicles, staff } = full;
  const schedule = advance.schedule ?? { times: {}, notes: {} };

  const timeline = SCHEDULE_SLOTS.map(([key, label]) => ({ key, label, time: schedule.times[key] ?? "", note: schedule.notes[key] ?? "" }))
    .filter((s) => s.time || s.note)
    .sort((a, b) => (toMinutes(a.time) ?? 9999) - (toMinutes(b.time) ?? 9999));

  const rules = items.filter((it) => it.state === "rule");
  const provided = items.filter((it) => it.state === "met" || (it.state === "venue_decides" && it.decision === "accept"));
  const substituted = items.filter((it) => it.state === "venue_decides" && it.decision === "substitute");
  const declined = items.filter((it) => it.state === "declined" || (it.state === "venue_decides" && it.decision === "decline"));
  const openItems = items.filter((it) => (it.state === "venue_decides" && !it.decision) || (it.state === "ask_artist" && !it.artistAnswer));
  const hospitality = items.filter((it) => (it.category === "hospitality" || it.category === "food_beverage" || it.category === "dressing_room") && it.decision !== "decline" && it.state !== "declined");
  const techNotes = items.filter((it) => ["sound", "monitors_iem", "power", "backline", "dj_equipment", "staging", "lighting", "video", "sfx"].includes(it.category) && (it.decision === "substitute" || (it.state === "venue_decides" && it.decision === "accept" && it.decisionNote)));

  const contacts = [
    ...party.filter((m) => ["Tour manager", "Artist", "FOH engineer", "Monitor engineer", "Driver"].includes(m.role)).map((m) => ({ who: `${m.name} (${m.role.toLowerCase()})`, phone: m.phone, side: "artist" as const })),
    ...staff.map((s) => ({ who: `${s.name} (${s.role.toLowerCase()})`, phone: s.phone, side: "venue" as const })),
  ];

  return (
    <div className="text-[15px] leading-snug">
      <header className="mb-5 border-b-2 border-ink pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-ink">Day of show · {venue.name}</p>
        <h1 className="text-3xl font-semibold">{advance.title}</h1>
        <p className="text-body">
          {fmtDate(advance.showDate)} · Doors {fmtTime(schedule.times.doors ?? advance.doorsTime) || "TBD"}
          {schedule.times.curfew ? ` · Curfew ${fmtTime(schedule.times.curfew)}` : ""}
          {venue.city ? ` · ${venue.city}` : ""}
        </p>
        {!advance.scheduleConfirmedAt ? <p className="mt-1 text-xs font-semibold text-decide">Draft: schedule not yet confirmed by the venue</p> : null}
      </header>

      <div className="grid gap-6 md:grid-cols-5">
        <section className="md:col-span-3">
          <h2 className="mb-2 text-xl font-semibold">Schedule</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">No times set.</p>
          ) : (
            <table className="w-full">
              <tbody>
                {timeline.map((s) => (
                  <tr key={s.key} className="border-b border-line align-top">
                    <td className="w-24 py-1.5 pr-3 font-semibold tabular-nums">{fmtTime(s.time) || "—"}</td>
                    <td className="py-1.5 pr-3">{s.label}</td>
                    <td className="py-1.5 text-sm text-body">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {advance.dosNotes ? <p className="mt-3 whitespace-pre-line rounded-md bg-card px-3 py-2 text-sm">{advance.dosNotes}</p> : null}
        </section>

        <section className="md:col-span-2">
          <h2 className="mb-2 text-xl font-semibold">Contacts</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted">No contacts yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {contacts.map((c, i) => (
                <li key={i} className="flex justify-between gap-2 py-1.5">
                  <span>{c.who}</span>
                  <span className="tabular-nums text-body">{audience === "venue" || c.side === "venue" ? (c.phone ?? "") : c.phone ? "on file" : ""}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mb-1 mt-4 text-base font-semibold">Party and vehicles</h3>
          <p className="text-sm text-body">
            {party.length ? `${party.length} traveling` : "Roster not provided"}
            {vehicles.length ? ` · ${vehicles.map((v) => `${v.kind}${v.plate ? ` ${v.plate}` : ""}`).join(", ")}` : ""}
          </p>
        </section>
      </div>

      {rules.length ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xl font-semibold">Rules for the day</h2>
          <ul className="list-disc space-y-0.5 pl-5">
            {rules.map((it) => (
              <li key={it.id}>{it.text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {techNotes.length ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xl font-semibold">Production notes</h2>
          <ul className="list-disc space-y-0.5 pl-5">
            {techNotes.map((it) => (
              <li key={it.id}>
                <span className="text-body">{humanCategory(it.category)}:</span> {it.text}
                {it.decision === "substitute" ? <span className="font-semibold"> → {it.decisionNote ?? it.suggestedSubstitute}</span> : it.decisionNote ? ` — ${it.decisionNote}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hospitality.length ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xl font-semibold">Hospitality</h2>
          <ul className="list-disc space-y-0.5 pl-5">
            {hospitality.map((it) => (
              <li key={it.id}>
                {it.quantity ? `${it.quantity} ` : ""}
                {it.text}
                {it.decision === "substitute" ? <span className="font-semibold"> → {it.decisionNote ?? it.suggestedSubstitute}</span> : it.decisionNote ? ` — ${it.decisionNote}` : ""}
                {audience === "venue" && it.costNote ? <span className="text-xs text-muted"> ({it.costNote})</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {substituted.length ? (
          <section>
            <h2 className="mb-2 text-xl font-semibold">Substitutions agreed</h2>
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {substituted.map((it) => (
                <li key={it.id}>
                  {it.text} → <b>{it.decisionNote ?? it.suggestedSubstitute}</b>
                  {it.tmApprovalRequired ? (it.tmApproved ? " (artist approved)" : " (awaiting artist sign-off)") : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {declined.length ? (
          <section>
            <h2 className="mb-2 text-xl font-semibold">Not provided</h2>
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {declined.map((it) => (
                <li key={it.id}>
                  {it.text}
                  {it.decisionNote ? ` — ${it.decisionNote}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {openItems.length && audience === "venue" ? (
        <section className="mt-6 rounded-md border border-decide/40 bg-decide-bg/40 px-3 py-2 text-sm">
          <b>{openItems.length} item{openItems.length === 1 ? "" : "s"} still open</b> on the worklist. They are not on this sheet until resolved.
        </section>
      ) : null}

      <p className="mt-6 text-xs text-muted">
        {provided.length} items provided by the house · {artist.name}
        {artist.agency ? ` (${artist.agency})` : ""} · generated by Advance
      </p>
    </div>
  );
}
