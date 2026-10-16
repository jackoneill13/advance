import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdvanceFull, isOpen } from "@/lib/queries";
import { setScopeMessage, publishAdvance, logMessage } from "@/app/actions";
import { ItemCard } from "@/components/ItemCard";
import { AdvanceTabs } from "@/components/AdvanceTabs";
import { Card, PageTitle, STATE_LABEL, btnAccent, btnGhost, btnPrimary, input, label } from "@/components/ui";
import { fmtDate, fmtStamp } from "@/lib/time";
import type { ItemState } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const ORDER: ItemState[] = ["venue_decides", "ask_artist", "rule", "declined", "met"];

export default async function WorklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getAdvanceFull(id);
  if (!full) notFound();
  const { advance, venue, artist, rider, items, messages } = full;
  const open = items.filter(isOpen).length;
  const byState = new Map<ItemState, typeof items>();
  for (const s of ORDER) byState.set(s, []);
  for (const it of items) byState.get(it.state)!.push(it);
  const parse = rider?.parsed ?? null;

  return (
    <div>
      <PageTitle
        eyebrow={`${venue.name} · ${fmtDate(advance.showDate)}`}
        title={advance.title}
        right={
          <>
            <Link href={`/a/${advance.shareToken}`} className={btnGhost} target="_blank">
              Artist link
            </Link>
            <Link href={`/advances/${advance.id}/sheet`} className={btnGhost}>
              Advance sheet
            </Link>
            <form action={publishAdvance}>
              <input type="hidden" name="advanceId" value={advance.id} />
              <button className={btnAccent} disabled={open > 0} title={open > 0 ? `${open} items still open` : "Publish the sheets"}>
                {open === 0 ? "Publish" : `${open} open`}
              </button>
            </form>
          </>
        }
      />
      <AdvanceTabs id={advance.id} active="worklist" />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ORDER.map((s) => (
          <a key={s} href={`#${s}`} className="rounded-lg border border-line bg-white px-3 py-2">
            <p className="text-2xl font-semibold leading-none">{byState.get(s)!.length}</p>
            <p className="text-xs text-body">{STATE_LABEL[s]}</p>
          </a>
        ))}
      </div>

      {parse ? (
        <Card className="mb-4 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-body">
            <span>
              <b>Artist:</b> {parse.artist ?? artist.name}
            </span>
            {parse.agency ? (
              <span>
                <b>Agency:</b> {parse.agency}
              </span>
            ) : null}
            <span>
              <b>Rider dated:</b> {parse.datedOn ?? "not stated"}
            </span>
            <span>
              <b>Deviations cleared by:</b> {parse.deviationAuthority.replace("_", " ")}
            </span>
            {parse.partySizeInferred ? (
              <span>
                <b>Party:</b> ~{parse.partySizeInferred} (inferred)
              </span>
            ) : null}
          </div>
          {parse.missingReferencedDocs.length ? (
            <p className="mt-2">
              <b>Missing documents:</b> {parse.missingReferencedDocs.join("; ")}
            </p>
          ) : null}
          {parse.contradictions.length ? (
            <p className="mt-1">
              <b>Contradictions in the rider:</b> {parse.contradictions.join("; ")}
            </p>
          ) : null}
          {advance.fit ? <p className={`mt-2 ${advance.fit.mismatch ? "font-semibold text-decide" : "text-muted"}`}>{advance.fit.summary}</p> : null}
        </Card>
      ) : null}

      {advance.fit?.mismatch || advance.scopeMessage ? (
        <Card className="mb-6 border-decide/40 bg-decide-bg/40">
          <h2 className="text-xl font-semibold">Scope message to the artist&apos;s representative</h2>
          <p className="mb-2 text-sm text-body">Send this before working the list; most arena-scale asks resolve in one reply.</p>
          <form action={setScopeMessage} className="space-y-2">
            <input type="hidden" name="advanceId" value={advance.id} />
            <textarea name="scopeMessage" rows={6} defaultValue={advance.scopeMessage ?? ""} className={input} />
            <div className="flex gap-2">
              <button className={btnPrimary}>Save draft</button>
            </div>
          </form>
        </Card>
      ) : null}

      {ORDER.map((s) => {
        const list = byState.get(s)!;
        if (list.length === 0) return null;
        return (
          <section key={s} id={s} className="mb-8 scroll-mt-20">
            <h2 className="mb-3 text-2xl font-semibold">
              {STATE_LABEL[s]} <span className="text-base font-normal text-muted">{list.length}</span>
            </h2>
            <div className="space-y-3">
              {list.map((it) => (
                <ItemCard key={it.id} item={it} advanceId={advance.id} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">Log</h2>
        <Card>
          <form action={logMessage} className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="advanceId" value={advance.id} />
            <select name="channel" className={`${input} sm:w-32`} defaultValue="note">
              <option value="note">Note</option>
              <option value="email">Email</option>
              <option value="sms">Text</option>
            </select>
            <input name="party" placeholder="With whom" className={`${input} sm:w-40`} />
            <input name="body" placeholder="What was said or agreed" className={`${input} sm:flex-1`} required />
            <button className={btnGhost}>Log</button>
          </form>
          {messages.length === 0 ? (
            <p className="text-sm text-muted">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {messages.map((m) => (
                <li key={m.id} className="py-2">
                  <span className="text-xs uppercase text-muted">
                    {m.channel} {m.direction === "in" ? "from" : "to"} {m.party} · {fmtStamp(m.createdAt)}
                  </span>
                  <p>{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
      <p className="text-xs text-muted">
        <span className={label}>Models</span> parse: {rider?.parseModel ?? "demo"} · match: {advance.matchModel ?? "demo"}
      </p>
    </div>
  );
}
