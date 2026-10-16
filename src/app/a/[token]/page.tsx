import { notFound } from "next/navigation";
import { getAdvanceByToken, guestAllocation } from "@/lib/queries";
import { answerQuestion, approveSubstitute, artistAddPartyMember, artistAddGuest, artistAddVehicle } from "@/app/actions";
import { Card, input, btnPrimary, btnGhost, btnDanger, Empty } from "@/components/ui";
import { PARTY_ROLES } from "@/lib/schemas";
import { fmtDate } from "@/lib/time";
import { isPastCutoff } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ArtistSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const full = await getAdvanceByToken(token);
  if (!full) notFound();
  const { advance, venue, artist, items, party, guests, vehicles } = full;
  const questions = items.filter((it) => it.state === "ask_artist");
  const openQuestions = questions.filter((it) => !it.artistAnswer);
  const answered = questions.filter((it) => it.artistAnswer);
  const signoffs = items.filter((it) => it.state === "venue_decides" && it.tmApprovalRequired && it.decision && it.decision !== "accept");
  const pendingSignoffs = signoffs.filter((it) => !it.tmApproved && !it.artistAnswer);
  const allocation = guestAllocation(venue.specPack, guests, artist.name);
  const pastCutoff = isPastCutoff(advance.showDate, advance.doorsTime, venue.specPack.compPolicy.cutoffHoursBeforeDoors);
  const provided = items.filter((it) => it.state === "met" || (it.state === "venue_decides" && it.decision === "accept"));

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-ink">Advance · {venue.name}</p>
        <h1 className="text-3xl font-semibold">
          {artist.name} · {fmtDate(advance.showDate)}
        </h1>
        <p className="mt-1 text-sm text-body">
          {openQuestions.length + pendingSignoffs.length === 0
            ? "Nothing open on your side right now. Thank you."
            : `${openQuestions.length} question${openQuestions.length === 1 ? "" : "s"} and ${pendingSignoffs.length} sign-off${pendingSignoffs.length === 1 ? "" : "s"} are waiting on you. No login needed.`}
        </p>
      </div>

      {openQuestions.length ? (
        <section className="mb-8">
          <h2 className="mb-2 text-2xl font-semibold">Questions from the venue</h2>
          <div className="space-y-3">
            {openQuestions.map((it) => (
              <Card key={it.id}>
                <p className="text-base">{it.questionForArtist ?? it.text}</p>
                <p className="mt-1 text-xs text-muted">From the rider: &ldquo;{it.text}&rdquo;</p>
                <form action={answerQuestion} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="itemId" value={it.id} />
                  <input name="answer" required placeholder="Your answer" className={`${input} sm:flex-1`} />
                  <button className={btnPrimary}>Send</button>
                </form>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {pendingSignoffs.length ? (
        <section className="mb-8">
          <h2 className="mb-2 text-2xl font-semibold">Substitutions to approve</h2>
          <p className="mb-3 text-sm text-body">The rider says deviations need your side&apos;s approval. Here is what the room is proposing.</p>
          <div className="space-y-3">
            {pendingSignoffs.map((it) => (
              <Card key={it.id}>
                <p className="text-xs text-muted">Rider: {it.text}</p>
                <p className="mt-1 text-base">
                  <b>{it.decision === "decline" ? "Not available at this room." : "Proposed:"}</b> {it.decisionNote ?? it.suggestedSubstitute ?? ""}
                </p>
                <form action={approveSubstitute} className="mt-3 flex gap-2">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="itemId" value={it.id} />
                  <button name="approved" value="1" className={btnPrimary}>
                    Approve
                  </button>
                  <button name="approved" value="0" className={btnDanger}>
                    Not OK
                  </button>
                </form>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-2 text-2xl font-semibold">Touring party</h2>
        <p className="mb-3 text-sm text-body">Everyone traveling, so passes and the door list are right. Dietary notes go to hospitality only.</p>
        <Card>
          {party.length ? (
            <ul className="mb-3 divide-y divide-line text-sm">
              {party.map((m) => (
                <li key={m.id} className="py-1.5">
                  <b>{m.name}</b> · {m.role}
                  {m.arrival ? ` · arrives ${m.arrival}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No one added yet.</Empty>
          )}
          <form action={artistAddPartyMember} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="token" value={token} />
            <input name="name" required placeholder="Name" className={input} />
            <select name="role" className={input} defaultValue="Tour manager">
              {PARTY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input name="phone" placeholder="Cell (day-of contact)" className={input} />
            <input name="arrival" placeholder="Arrival (time, or flight)" className={input} />
            <input name="dietary" placeholder="Dietary notes" className={`${input} sm:col-span-2`} />
            <button className={`${btnPrimary} sm:col-span-2`}>Add to party</button>
          </form>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-2xl font-semibold">Guest list</h2>
        <p className="mb-3 text-sm text-body">
          {allocation.map((a) => `${a.act}: ${a.used} of ${a.allowed} used`).join(" · ")}. Cutoff is {venue.specPack.compPolicy.cutoffHoursBeforeDoors} hours before doors
          {pastCutoff ? "; names added now are late adds and go to the venue for approval." : "."}
        </p>
        <Card>
          {guests.length ? (
            <ul className="mb-3 divide-y divide-line text-sm">
              {guests.map((g) => (
                <li key={g.id} className="py-1.5">
                  <b>{g.name}</b>
                  {g.plusOnes ? ` +${g.plusOnes}` : ""} · {g.actName}
                  {g.late ? <span className="ml-2 rounded bg-decide-bg px-1.5 text-xs text-decide">late add</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No names yet.</Empty>
          )}
          <form action={artistAddGuest} className="mt-3 grid gap-2 sm:grid-cols-4">
            <input type="hidden" name="token" value={token} />
            <input name="addedBy" placeholder="Your name" className={input} />
            <input name="name" required placeholder="Guest name" className={input} />
            <input name="plusOnes" type="number" min={0} defaultValue={0} className={input} />
            <input name="actName" placeholder="Act" defaultValue={artist.name} className={input} />
            <button className={`${btnPrimary} sm:col-span-4`}>Add guest</button>
          </form>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-2xl font-semibold">Vehicles</h2>
        <Card>
          {vehicles.length ? (
            <ul className="mb-3 divide-y divide-line text-sm">
              {vehicles.map((v) => (
                <li key={v.id} className="py-1.5">
                  <b>{v.kind}</b>
                  {v.plate ? ` · ${v.plate}` : ""}
                  {v.arrival ? ` · arrives ${v.arrival}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing listed.</Empty>
          )}
          <form action={artistAddVehicle} className="mt-3 grid gap-2 sm:grid-cols-5">
            <input type="hidden" name="token" value={token} />
            <select name="kind" className={input} defaultValue="Van">
              {["Bus", "Bus + trailer", "Van", "Van + trailer", "Box truck", "Car"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <input name="plate" placeholder="Plate" className={input} />
            <input name="driver" placeholder="Driver" className={input} />
            <input name="phone" placeholder="Driver cell" className={input} />
            <input name="arrival" placeholder="Arrival" className={input} />
            <button className={`${btnGhost} sm:col-span-5`}>Add vehicle</button>
          </form>
        </Card>
      </section>

      {answered.length || provided.length ? (
        <section className="mb-8">
          <h2 className="mb-2 text-2xl font-semibold">What&apos;s settled</h2>
          <Card>
            <ul className="divide-y divide-line text-sm">
              {answered.map((it) => (
                <li key={it.id} className="py-1.5">
                  <span className="text-muted">Q:</span> {it.questionForArtist ?? it.text} <span className="text-muted">·</span> <b>{it.artistAnswer}</b>
                </li>
              ))}
              {provided.slice(0, 40).map((it) => (
                <li key={it.id} className="py-1.5">
                  <span className="text-met">Provided:</span> {it.quantity ? `${it.quantity} ` : ""}
                  {it.text}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
