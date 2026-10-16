import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdvanceFull } from "@/lib/queries";
import { saveSchedule, reproposeSchedule, addVenueStaff, removeVenueStaff } from "@/app/actions";
import { AdvanceTabs } from "@/components/AdvanceTabs";
import { DosSheet } from "@/components/DosSheet";
import { PrintButton } from "@/components/PrintButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, PageTitle, input, label, btnAccent, btnGhost, btnPrimary, Empty } from "@/components/ui";
import { SCHEDULE_SLOTS } from "@/lib/schemas";
import { defaultSchedule } from "@/lib/scheduler";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["Production manager", "House sound", "Lighting", "Stage manager", "Runner", "Door", "Security", "Bar manager", "Merch seller", "GM"];

export default async function DosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { edit, saved } = await searchParams;
  const full = await getAdvanceFull(id);
  if (!full) notFound();
  const { advance, venue, staff } = full;
  const editing = edit === "1" || !advance.schedule;
  const schedule = advance.schedule ?? defaultSchedule(advance.doorsTime, venue.specPack);

  return (
    <div>
      <PageTitle
        eyebrow={`${venue.name} · ${fmtDate(advance.showDate)}`}
        title={advance.title}
        right={
          <>
            {!editing ? (
              <Link href={`/advances/${advance.id}/dos?edit=1`} className={btnGhost}>
                Edit schedule
              </Link>
            ) : null}
            <Link href={`/a/${advance.shareToken}/dos`} className={btnGhost} target="_blank">
              Artist copy
            </Link>
            <PrintButton>Print / save PDF</PrintButton>
          </>
        }
      />
      <AdvanceTabs id={advance.id} active="dos" />

      {saved ? <p className="no-print mb-4 rounded-md bg-met-bg px-3 py-2 text-sm text-met">Schedule saved as a draft. Confirm it when the times are final.</p> : null}

      {editing ? (
        <div className="no-print mb-8 grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Schedule</h2>
              <form action={reproposeSchedule}>
                <input type="hidden" name="advanceId" value={advance.id} />
                <SubmitButton className={btnGhost} pendingText="Proposing…">
                  Re-propose from rider
                </SubmitButton>
              </form>
            </div>
            <p className="mb-3 text-sm text-body">
              Proposed from the rider&apos;s requirements, the doors time, and house policy. Change anything; leave a time blank to drop the row.
            </p>
            <form action={saveSchedule} className="space-y-2">
              <input type="hidden" name="advanceId" value={advance.id} />
              {SCHEDULE_SLOTS.map(([key, title]) => (
                <div key={key} className="grid grid-cols-[7rem_1fr] items-center gap-2 sm:grid-cols-[9rem_7rem_1fr]">
                  <label className={label} htmlFor={`time_${key}`}>
                    {title}
                  </label>
                  <input id={`time_${key}`} name={`time_${key}`} type="time" defaultValue={schedule.times[key] ?? ""} className={input} />
                  <input name={`note_${key}`} placeholder="Note" defaultValue={schedule.notes[key] ?? ""} className={`${input} col-span-2 sm:col-span-1`} />
                </div>
              ))}
              <div className="pt-2">
                <label className={label} htmlFor="dosNotes">
                  Notes for the sheet
                </label>
                <textarea id="dosNotes" name="dosNotes" rows={3} defaultValue={advance.dosNotes ?? ""} className={input} placeholder="Anything the crew should know that isn't a line item: parking instructions, where the runner is, who holds keys." />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button name="confirm" value="1" className={btnAccent}>
                  Confirm schedule
                </button>
                <button name="confirm" value="0" className={btnPrimary}>
                  Save draft
                </button>
              </div>
            </form>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="mb-2 text-xl font-semibold">Venue staff on this show</h2>
            {staff.length === 0 ? (
              <Empty>No staff listed yet.</Empty>
            ) : (
              <ul className="mb-3 divide-y divide-line text-sm">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span>
                      <b>{s.name}</b> · {s.role}
                      {s.callTime ? ` · call ${s.callTime}` : ""}
                      {s.phone ? <span className="block text-xs text-muted">{s.phone}</span> : null}
                    </span>
                    <form action={removeVenueStaff}>
                      <input type="hidden" name="advanceId" value={advance.id} />
                      <input type="hidden" name="staffId" value={s.id} />
                      <button className="text-xs text-declined underline">remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addVenueStaff} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="advanceId" value={advance.id} />
              <input name="name" required placeholder="Name" className={input} />
              <select name="role" className={input} defaultValue="House sound">
                {STAFF_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <input name="phone" placeholder="Cell" className={input} />
              <input name="callTime" type="time" className={input} />
              <button className={`${btnPrimary} sm:col-span-2`}>Add</button>
            </form>
          </Card>
        </div>
      ) : null}

      <div className="rounded-xl border border-line bg-white p-5 print:border-0 print:p-0">
        <DosSheet full={full} audience="venue" />
      </div>
    </div>
  );
}
