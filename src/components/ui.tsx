import type { ItemState, RequirementLevel } from "@/lib/schemas";

export const input =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-accent/40";
export const label = "block text-sm font-semibold text-body";
export const btn = "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition";
export const btnPrimary = `${btn} bg-ink text-paper hover:bg-ink-2`;
export const btnAccent = `${btn} bg-accent text-ink hover:brightness-95`;
export const btnGhost = `${btn} border border-line bg-white text-ink hover:bg-card`;
export const btnDanger = `${btn} border border-declined/30 bg-white text-declined hover:bg-declined-bg`;

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-white p-4 ${className}`}>{children}</div>;
}

export function PageTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-ink">{eyebrow}</p> : null}
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
      </div>
      {right ? <div className="flex flex-wrap gap-2">{right}</div> : null}
    </div>
  );
}

export const STATE_LABEL: Record<ItemState, string> = {
  met: "Met",
  venue_decides: "Venue decides",
  ask_artist: "Ask the artist",
  rule: "Rule",
  declined: "Declined",
};

const STATE_CLASS: Record<ItemState, string> = {
  met: "bg-met-bg text-met",
  venue_decides: "bg-decide-bg text-decide",
  ask_artist: "bg-ask-bg text-ask",
  rule: "bg-rule-bg text-rule",
  declined: "bg-declined-bg text-declined",
};

export function StateBadge({ state }: { state: ItemState }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_CLASS[state]}`}>{STATE_LABEL[state]}</span>;
}

const REQ_LABEL: Record<RequirementLevel, string> = {
  hard: "hard",
  preferred: "preferred",
  wish: "wish",
  joke: "joke",
  process: "process",
};

export function RequirementBadge({ level }: { level: RequirementLevel }) {
  const cls = level === "hard" ? "border-ink text-ink" : level === "joke" ? "border-muted text-muted italic" : "border-line text-body";
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] uppercase tracking-wide ${cls}`}>{REQ_LABEL[level]}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

export function humanCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
