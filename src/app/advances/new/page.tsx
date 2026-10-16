import Link from "next/link";
import { listVenues } from "@/lib/queries";
import { createAdvance } from "@/app/actions";
import { ACCEPTED_EXTENSIONS } from "@/lib/ingest";
import { Card, PageTitle, input, label, btnAccent } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function NewAdvancePage() {
  const venues = await listVenues();
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  return (
    <div className="max-w-xl">
      <PageTitle eyebrow="New advance" title="Rider in" />
      {!hasKey ? (
        <p className="mb-4 rounded-md bg-declined-bg px-3 py-2 text-sm text-declined">
          No ANTHROPIC_API_KEY is set, so parsing is off. Add one to .env.local, or run <code>npm run seed</code> to load the demo advance.
        </p>
      ) : null}
      {venues.length === 0 ? (
        <p className="mb-4 rounded-md bg-decide-bg px-3 py-2 text-sm text-decide">
          Add a venue and its spec pack first:{" "}
          <Link href="/venues/new" className="underline">
            add a venue
          </Link>
          .
        </p>
      ) : null}
      <Card>
        <form action={createAdvance} className="space-y-4" encType="multipart/form-data">
          <div>
            <label className={label} htmlFor="venueId">
              Venue
            </label>
            <select id="venueId" name="venueId" required className={input} defaultValue={venues[0]?.id}>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.capacity} cap)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="artistName">
              Artist
            </label>
            <input id="artistName" name="artistName" required className={input} placeholder="Headliner name as billed" />
          </div>
          <div>
            <label className={label} htmlFor="title">
              Show title
            </label>
            <input id="title" name="title" className={input} placeholder="Optional; defaults to the artist name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="showDate">
                Show date
              </label>
              <input id="showDate" name="showDate" type="date" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="doorsTime">
                Doors
              </label>
              <input id="doorsTime" name="doorsTime" type="time" className={input} defaultValue="19:00" />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="files">
              Rider files
            </label>
            <input id="files" name="files" type="file" multiple accept={ACCEPTED_EXTENSIONS} className={`${input} file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1 file:text-paper`} />
            <p className="mt-1 text-xs text-muted">PDF, Word (.docx), text, or photos of each page (JPG/PNG). Add the stage plot and input list here too if you have them.</p>
          </div>
          <div>
            <label className={label} htmlFor="pastedText">
              Or paste the rider text
            </label>
            <textarea id="pastedText" name="pastedText" rows={4} className={input} placeholder="If the rider came in the body of an email, paste it here." />
          </div>
          <SubmitButton className={btnAccent} pendingText="Parsing and matching… about a minute">
            Parse and build the worklist
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
