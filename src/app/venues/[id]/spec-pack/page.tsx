import { notFound } from "next/navigation";
import Link from "next/link";
import { getVenue } from "@/lib/queries";
import { updateSpecPack } from "@/app/actions";
import { SPEC_SECTIONS } from "@/lib/schemas";
import { Card, PageTitle, input, label, btnAccent, btnGhost } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SpecPackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const venue = await getVenue(id);
  if (!venue) notFound();
  const pack = venue.specPack;
  const action = updateSpecPack.bind(null, venue.id);

  return (
    <div className="max-w-3xl">
      <PageTitle
        eyebrow="Spec pack"
        title={venue.name}
        right={
          <Link href="/advances/new" className={btnGhost}>
            Start an advance
          </Link>
        }
      />
      {saved ? <p className="mb-4 rounded-md bg-met-bg px-3 py-2 text-sm text-met">Spec pack saved.</p> : null}
      <p className="mb-4 text-sm text-body">
        Write what the room actually has, in plain language, as you would in a tech pack. Every rider is diffed against this. Be specific about models,
        counts, and heights; say what you will not do.
      </p>
      <form action={action} className="space-y-4">
        <Card>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="name">
                Venue name
              </label>
              <input id="name" name="name" defaultValue={venue.name} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="capacity">
                Capacity
              </label>
              <input id="capacity" name="capacity" type="number" defaultValue={pack.capacity} className={input} />
            </div>
            <div className="sm:col-span-3">
              <label className={label} htmlFor="city">
                City
              </label>
              <input id="city" name="city" defaultValue={venue.city ?? ""} className={input} />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Passes and comps</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-4">
              <label className={label} htmlFor="passTypes">
                Pass types (comma-separated)
              </label>
              <input id="passTypes" name="passTypes" defaultValue={pack.passTypes.join(", ")} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="compHeadliner">
                Headliner comps
              </label>
              <input id="compHeadliner" name="compHeadliner" type="number" defaultValue={pack.compPolicy.headliner} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="compSupport">
                Support comps
              </label>
              <input id="compSupport" name="compSupport" type="number" defaultValue={pack.compPolicy.support} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="compCutoff">
                Cutoff (h before doors)
              </label>
              <input id="compCutoff" name="compCutoff" type="number" defaultValue={pack.compPolicy.cutoffHoursBeforeDoors} className={input} />
            </div>
          </div>
        </Card>

        {SPEC_SECTIONS.map(([key, title, hint]) => (
          <Card key={key}>
            <label className="block" htmlFor={`section_${key}`}>
              <span className="text-xl font-semibold">{title}</span>
              <span className="mt-1 block text-xs text-muted">{hint}</span>
            </label>
            <textarea id={`section_${key}`} name={`section_${key}`} rows={5} defaultValue={pack.sections[key] ?? ""} className={`${input} mt-2`} />
          </Card>
        ))}

        <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
          <button className={btnAccent}>Save spec pack</button>
        </div>
      </form>
    </div>
  );
}
