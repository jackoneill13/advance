import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, MODELS } from "./anthropic";
import { specPackAsText } from "./matcher";
import { SCHEDULE_SLOTS, ScheduleDraftSchema, type RiderParse, type Schedule, type ScheduleDraft, type SpecPack } from "./schemas";

/** "19:00" -> minutes since midnight; null for anything unparsable. */
export function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 29 || min > 59) return null;
  return h * 60 + min;
}

export function fromMinutes(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** "19:00" -> "7:00 PM" for the printed sheet. */
export function fmtTime(hhmm: string | null | undefined): string {
  const m = toMinutes(hhmm);
  if (m === null) return "";
  const h24 = Math.floor(m / 60) % 24;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

/**
 * Deterministic baseline built from the one time the venue always knows (doors) and
 * the comp policy. Used when there is no API key, and as the floor the model refines.
 */
export function defaultSchedule(doorsTime: string | null, pack: SpecPack): Schedule {
  const doors = toMinutes(doorsTime) ?? toMinutes("19:00")!;
  const times: Record<string, string> = {
    venueCall: fromMinutes(doors - 240),
    loadIn: fromMinutes(doors - 180),
    soundcheckHeadliner: fromMinutes(doors - 120),
    soundcheckSupport: fromMinutes(doors - 60),
    dinner: fromMinutes(doors - 90),
    guestListCutoff: fromMinutes(doors - pack.compPolicy.cutoffHoursBeforeDoors * 60),
    doors: fromMinutes(doors),
    supportSet: fromMinutes(doors + 60),
    changeover: fromMinutes(doors + 100),
    headlinerSet: fromMinutes(doors + 120),
    loadOut: fromMinutes(doors + 210),
    settlement: fromMinutes(doors + 210),
  };
  const notes: Record<string, string> = {
    venueCall: "house sound + loaders",
    soundcheckSupport: "after headliner check",
    guestListCutoff: `${pack.compPolicy.cutoffHoursBeforeDoors} h before doors, house policy`,
    supportSet: "30–40 min",
    headlinerSet: "set length per artist",
    settlement: "after load-out",
  };
  const curfew = extractCurfew(pack.sections.policies ?? "");
  if (curfew) {
    times.curfew = curfew;
    notes.curfew = "house policy";
  }
  return { times, notes };
}

/** Pull the first "HH:MM am/pm" that follows the word curfew in the policies text. */
export function extractCurfew(policies: string): string | null {
  const m = /curfew[^0-9]{0,40}(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(policies);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "pm") h += 12;
  return fromMinutes(h * 60 + Number(m[2] ?? 0));
}

const SCHEDULER_SYSTEM = `
You draft the day-of-show schedule for a live music venue from the artist's rider, the venue's spec pack, and the show's doors time.

Rules:
- Doors is fixed. Work backwards from it for load-in and soundcheck and forwards for sets and curfew.
- Honor rider requirements first (load-in offset before doors, minimum soundcheck length, production access before soundcheck), then house policy (curfew, guest list cutoff), then defaults.
- Set lengths: use the rider if stated; otherwise 30–40 minutes for support, 60–90 for a headliner at club level. Changeover 20–30 minutes.
- The headliner finishes before curfew with a 10-minute margin. If that is impossible with the rider's minimums, keep doors fixed, note the conflict in that slot's note, and still return a time.
- Settlement and load-out follow the headliner set. Dinner or buyout sits between soundcheck and doors unless the rider sets a time.
- Backline / rentals arrive before the headliner's soundcheck, at least 30 minutes before, when the advance has rentals.
- Times are HH:MM 24-hour. Leave a slot null only if there is no reasonable basis for it.
- Notes are short: "per rider: 2 h min", "house curfew", "75 min set". The basis list says, one line each, which rider line or spec-pack fact drove each non-default time.
`.trim();

export type ScheduleOutcome = { schedule: Schedule; basis: string[]; model: string | null };

export async function proposeSchedule(args: {
  venueName: string;
  specPack: SpecPack;
  parse: RiderParse;
  doorsTime: string | null;
  hasRentals: boolean;
}): Promise<ScheduleOutcome> {
  const fallback = defaultSchedule(args.doorsTime, args.specPack);
  if (!process.env.ANTHROPIC_API_KEY) return { schedule: fallback, basis: ["No API key; baseline schedule from doors time and house policy."], model: null };

  const client = anthropic();
  const scheduleLines = args.parse.items.filter((it) =>
    ["schedule", "crew", "process", "guest_list", "hospitality"].includes(it.category),
  );
  const message = await client.messages.parse({
    model: MODELS.match,
    max_tokens: 4000,
    system: [
      { type: "text", text: SCHEDULER_SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: specPackAsText(args.venueName, args.specPack), cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Doors: ${args.doorsTime ?? "19:00"}. Rentals on this advance: ${args.hasRentals ? "yes" : "no"}.\n` +
              `Slots to fill: ${SCHEDULE_SLOTS.map(([k, label]) => `${k} (${label})`).join(", ")}.\n` +
              `Baseline (override where the rider or policy says otherwise): ${JSON.stringify(fallback.times)}\n\n` +
              `Rider lines that bear on the schedule:\n` +
              scheduleLines.map((it) => `- [${it.category}] ${it.text}${it.spec ? ` (${it.spec})` : ""}`).join("\n"),
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ScheduleDraftSchema) },
  });
  const draft: ScheduleDraft | null = message.parsed_output;
  if (!draft) return { schedule: fallback, basis: ["Scheduler returned nothing; baseline used."], model: MODELS.match };

  const times: Record<string, string> = { ...fallback.times };
  const notes: Record<string, string> = { ...fallback.notes };
  for (const [k, v] of Object.entries(draft.times)) if (v && toMinutes(v) !== null) times[k] = v;
  for (const [k, v] of Object.entries(draft.notes)) if (v) notes[k] = v;
  return { schedule: { times, notes }, basis: draft.basis, model: MODELS.match };
}
