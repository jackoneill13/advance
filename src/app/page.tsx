import Link from "next/link";
import { listAdvances, listVenues } from "@/lib/queries";
import { Card, PageTitle, btnAccent, btnGhost, Empty } from "@/components/ui";
import { fmtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [advances, venues] = await Promise.all([listAdvances(), listVenues()]);
  return (
    <div>
      <PageTitle
        eyebrow="Venue console"
        title="Advances"
        right={
          <>
            <Link href="/venues/new" className={btnGhost}>
              Add a venue
            </Link>
            <Link href="/advances/new" className={btnAccent}>
              New advance
            </Link>
          </>
        }
      />

      {venues.length === 0 ? (
        <Card className="mb-6 bg-card">
          <h2 className="text-xl font-semibold">Start with your spec pack</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-body">
            <li>Add your venue and fill in the spec pack (what the room has). Fifteen minutes, once.</li>
            <li>Start an advance: upload the rider as PDF, Word, text, or photos.</li>
            <li>Clear the worklist, send the artist their link, publish the sheets.</li>
          </ol>
          <Link href="/venues/new" className={`${btnAccent} mt-4`}>
            Add your venue
          </Link>
        </Card>
      ) : null}

      {advances.length === 0 ? (
        <Empty>No advances yet. Start one with a rider and the worklist appears here.</Empty>
      ) : (
        <ul className="space-y-3">
          {advances.map((a) => (
            <li key={a.id}>
              <Link href={`/advances/${a.id}`} className="block rounded-xl border border-line bg-white p-4 hover:border-ink">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{a.title}</p>
                    <p className="text-sm text-body">
                      {a.artistName} · {a.venueName} · {fmtDate(a.showDate)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">
                      {a.open === 0 ? <span className="text-met">Nothing open</span> : <span className="text-decide">{a.open} open</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {a.byState.met} met · {a.byState.venue_decides} decide · {a.byState.ask_artist} ask · {a.status}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
