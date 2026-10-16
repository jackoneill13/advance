import type { LineItem } from "@/db/schema";
import { decideItem, clearDecision } from "@/app/actions";
import { StateBadge, RequirementBadge, btnGhost, btnPrimary, btnDanger, input, humanCategory } from "./ui";
import { fmtStamp } from "@/lib/time";

export function ItemCard({ item, advanceId }: { item: LineItem; advanceId: string }) {
  const decided = Boolean(item.decision);
  const awaitingTm = item.state === "venue_decides" && item.tmApprovalRequired && item.decision && item.decision !== "accept" && !item.tmApproved;
  return (
    <div className={`rounded-xl border bg-white p-4 ${decided && !awaitingTm ? "border-line opacity-80" : "border-line"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StateBadge state={item.state} />
        <RequirementBadge level={item.requirement} />
        <span className="text-xs text-muted">
          {humanCategory(item.category)}
          {item.page ? ` · p.${item.page}` : ""}
          {item.confidence !== "high" ? ` · ${item.confidence} confidence` : ""}
        </span>
      </div>
      <p className="text-base leading-snug text-ink">
        {item.quantity ? <b className="mr-1">{item.quantity}</b> : null}
        {item.text}
        {item.spec ? <span className="text-body"> — {item.spec}</span> : null}
      </p>
      <p className="mt-2 text-sm text-body">{item.reason}</p>
      {item.suggestedSubstitute ? (
        <p className="mt-2 rounded-md bg-card px-3 py-2 text-sm">
          <span className="font-semibold">Suggested:</span> {item.suggestedSubstitute}
        </p>
      ) : null}
      {item.costNote ? <p className="mt-1 text-xs text-muted">Cost: {item.costNote}</p> : null}
      {item.state === "ask_artist" ? (
        <div className="mt-2 rounded-md border border-ask/20 bg-ask-bg px-3 py-2 text-sm">
          <p className="font-semibold text-ask">Question sent via share link</p>
          <p>{item.questionForArtist ?? item.text}</p>
          {item.artistAnswer ? (
            <p className="mt-1 text-ink">
              <span className="font-semibold">Answer:</span> {item.artistAnswer} <span className="text-xs text-muted">{fmtStamp(item.answeredAt)}</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">Waiting on the artist</p>
          )}
        </div>
      ) : null}

      {item.state === "venue_decides" ? (
        decided ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold capitalize text-paper">{item.decision}</span>
            {item.decisionNote ? <span className="text-body">{item.decisionNote}</span> : null}
            <span className="text-xs text-muted">{fmtStamp(item.decidedAt)}</span>
            {awaitingTm ? (
              <span className="rounded-full bg-decide-bg px-2.5 py-0.5 text-xs font-semibold text-decide">
                {item.artistAnswer ? item.artistAnswer : "Needs artist sign-off"}
              </span>
            ) : null}
            <form action={clearDecision} className="ml-auto">
              <input type="hidden" name="advanceId" value={advanceId} />
              <input type="hidden" name="itemId" value={item.id} />
              <button className="text-xs text-muted underline">change</button>
            </form>
          </div>
        ) : (
          <form action={decideItem} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input type="hidden" name="advanceId" value={advanceId} />
            <input type="hidden" name="itemId" value={item.id} />
            <input name="note" placeholder="Note (what you're providing, from whom, cost)" className={`${input} sm:flex-1`} />
            <div className="flex gap-2">
              <button name="decision" value="accept" className={btnPrimary}>
                Provide
              </button>
              <button name="decision" value="substitute" className={btnGhost}>
                Substitute
              </button>
              <button name="decision" value="decline" className={btnDanger}>
                Decline
              </button>
            </div>
          </form>
        )
      ) : null}
    </div>
  );
}
