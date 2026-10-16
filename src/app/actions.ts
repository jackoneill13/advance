"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/db";
import { runAdvancePipeline } from "@/lib/pipeline";
import { mimeFromName, type IngestedFile } from "@/lib/ingest";
import {
  SPEC_SECTIONS,
  SCHEDULE_SLOTS,
  SpecPackSchema,
  ScheduleSchema,
  DECISIONS,
  DEFAULT_PASS_BY_ROLE,
  type Decision,
  type PartyRole,
  type SpecPack,
} from "@/lib/schemas";
import { defaultSchedule, proposeSchedule, toMinutes } from "@/lib/scheduler";
import { getAdvanceByToken, getAdvanceFull, isOpen } from "@/lib/queries";
import { isPastCutoff } from "@/lib/time";

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v.length ? v : null;
}
function num(form: FormData, key: string, fallback: number): number {
  const n = Number(str(form, key));
  return Number.isFinite(n) ? n : fallback;
}

/* ------------------------------------------------------------------ */
/* Venues and spec packs                                               */
/* ------------------------------------------------------------------ */

export async function createVenue(form: FormData) {
  const id = nanoid(12);
  const capacity = num(form, "capacity", 300);
  const specPack: SpecPack = SpecPackSchema.parse({ capacity, sections: {} });
  await db.insert(schema.venues).values({
    id,
    name: str(form, "name") || "Untitled venue",
    city: opt(form, "city"),
    capacity,
    specPack,
  });
  redirect(`/venues/${id}/spec-pack`);
}

export async function updateSpecPack(venueId: string, form: FormData) {
  const sections: Record<string, string> = {};
  for (const [key] of SPEC_SECTIONS) sections[key] = str(form, `section_${key}`);
  const passTypes = str(form, "passTypes")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const specPack = SpecPackSchema.parse({
    capacity: num(form, "capacity", 300),
    passTypes: passTypes.length ? passTypes : undefined,
    compPolicy: {
      headliner: num(form, "compHeadliner", 10),
      support: num(form, "compSupport", 5),
      cutoffHoursBeforeDoors: num(form, "compCutoff", 4),
    },
    sections,
  });
  await db
    .update(schema.venues)
    .set({ name: str(form, "name") || "Untitled venue", city: opt(form, "city"), capacity: specPack.capacity, specPack })
    .where(eq(schema.venues.id, venueId));
  revalidatePath(`/venues/${venueId}/spec-pack`);
  redirect(`/venues/${venueId}/spec-pack?saved=1`);
}

/* ------------------------------------------------------------------ */
/* Advances                                                            */
/* ------------------------------------------------------------------ */

export async function createAdvance(form: FormData) {
  const venueId = str(form, "venueId");
  const artistName = str(form, "artistName") || "Unknown artist";
  const title = str(form, "title") || artistName;
  const files: IngestedFile[] = [];
  for (const entry of form.getAll("files")) {
    if (entry instanceof File && entry.size > 0) {
      files.push({ name: entry.name, mimeType: mimeFromName(entry.name, entry.type), bytes: Buffer.from(await entry.arrayBuffer()) });
    }
  }
  const pasted = str(form, "pastedText");
  if (pasted) files.push({ name: "pasted-rider.txt", mimeType: "text/plain", bytes: Buffer.from(pasted, "utf8") });
  if (!venueId) throw new Error("Pick a venue.");
  if (files.length === 0) throw new Error("Attach the rider (PDF, Word, text, or photos) or paste its text.");

  const { advanceId } = await runAdvancePipeline({
    venueId,
    artistName,
    title,
    showDate: opt(form, "showDate"),
    doorsTime: opt(form, "doorsTime"),
    files,
  });
  redirect(`/advances/${advanceId}`);
}

export async function decideItem(form: FormData) {
  const advanceId = str(form, "advanceId");
  const itemId = str(form, "itemId");
  const decision = str(form, "decision") as Decision;
  if (!(DECISIONS as readonly string[]).includes(decision)) throw new Error("Unknown decision.");
  await db
    .update(schema.lineItems)
    .set({
      decision,
      decisionNote: opt(form, "note"),
      decidedBy: opt(form, "decidedBy") ?? "venue",
      decidedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.lineItems.id, itemId), eq(schema.lineItems.advanceId, advanceId)));
  await refreshStatus(advanceId);
  revalidatePath(`/advances/${advanceId}`);
}

export async function clearDecision(form: FormData) {
  const advanceId = str(form, "advanceId");
  const itemId = str(form, "itemId");
  await db
    .update(schema.lineItems)
    .set({ decision: null, decisionNote: null, decidedBy: null, decidedAt: null, tmApproved: false })
    .where(and(eq(schema.lineItems.id, itemId), eq(schema.lineItems.advanceId, advanceId)));
  await refreshStatus(advanceId);
  revalidatePath(`/advances/${advanceId}`);
}

export async function setScopeMessage(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.update(schema.advances).set({ scopeMessage: opt(form, "scopeMessage") }).where(eq(schema.advances.id, advanceId));
  revalidatePath(`/advances/${advanceId}`);
}

export async function logMessage(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.insert(schema.messages).values({
    id: nanoid(12),
    advanceId,
    channel: (str(form, "channel") as "email" | "sms" | "share" | "note") || "note",
    direction: (str(form, "direction") as "out" | "in") || "out",
    party: str(form, "party") || "venue",
    body: str(form, "body"),
  });
  revalidatePath(`/advances/${advanceId}`);
}

export async function publishAdvance(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.update(schema.advances).set({ status: "published" }).where(eq(schema.advances.id, advanceId));
  revalidatePath(`/advances/${advanceId}`);
  redirect(`/advances/${advanceId}/dos`);
}

/* ------------------------------------------------------------------ */
/* Day-of-show schedule                                                */
/* ------------------------------------------------------------------ */

export async function saveSchedule(form: FormData) {
  const advanceId = str(form, "advanceId");
  const times: Record<string, string> = {};
  const notes: Record<string, string> = {};
  for (const [key] of SCHEDULE_SLOTS) {
    const t = str(form, `time_${key}`);
    if (t && toMinutes(t) !== null) times[key] = t;
    const n = str(form, `note_${key}`);
    if (n) notes[key] = n;
  }
  const schedule = ScheduleSchema.parse({ times, notes });
  const confirm = str(form, "confirm") === "1";
  await db
    .update(schema.advances)
    .set({
      schedule,
      doorsTime: times.doors ?? null,
      dosNotes: opt(form, "dosNotes"),
      scheduleConfirmedAt: confirm ? new Date().toISOString() : null,
    })
    .where(eq(schema.advances.id, advanceId));
  revalidatePath(`/advances/${advanceId}/dos`);
  redirect(`/advances/${advanceId}/dos${confirm ? "" : "?edit=1&saved=1"}`);
}

export async function reproposeSchedule(form: FormData) {
  const advanceId = str(form, "advanceId");
  const full = await getAdvanceFull(advanceId);
  if (!full) throw new Error("Advance not found.");
  const hasRentals = full.items.some((it) => it.costNote && /rent/i.test(it.costNote));
  const proposed = full.rider?.parsed
    ? await proposeSchedule({
        venueName: full.venue.name,
        specPack: full.venue.specPack,
        parse: full.rider.parsed,
        doorsTime: full.advance.doorsTime,
        hasRentals,
      })
    : { schedule: defaultSchedule(full.advance.doorsTime, full.venue.specPack), basis: ["Baseline from doors time."], model: null };
  await db.update(schema.advances).set({ schedule: proposed.schedule, scheduleConfirmedAt: null }).where(eq(schema.advances.id, advanceId));
  await db.insert(schema.messages).values({
    id: nanoid(12),
    advanceId,
    channel: "note",
    direction: "in",
    party: "scheduler",
    body: `Re-proposed schedule. ${proposed.basis.join(" ")}`,
  });
  revalidatePath(`/advances/${advanceId}/dos`);
  redirect(`/advances/${advanceId}/dos?edit=1`);
}

export async function addVenueStaff(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.insert(schema.venueStaff).values({
    id: nanoid(12),
    advanceId,
    name: str(form, "name"),
    role: str(form, "role") || "Staff",
    phone: opt(form, "phone"),
    callTime: opt(form, "callTime"),
  });
  revalidatePath(`/advances/${advanceId}/dos`);
}

export async function removeVenueStaff(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.delete(schema.venueStaff).where(and(eq(schema.venueStaff.id, str(form, "staffId")), eq(schema.venueStaff.advanceId, advanceId)));
  revalidatePath(`/advances/${advanceId}/dos`);
}

async function refreshStatus(advanceId: string) {
  const full = await getAdvanceFull(advanceId);
  if (!full) return;
  const open = full.items.filter((it) => isOpen(it)).length;
  const next = full.advance.status === "published" ? "published" : open === 0 ? "ready" : "open";
  if (next !== full.advance.status) await db.update(schema.advances).set({ status: next }).where(eq(schema.advances.id, advanceId));
}

/* ------------------------------------------------------------------ */
/* People and access (venue side)                                      */
/* ------------------------------------------------------------------ */

export async function addPartyMember(form: FormData) {
  const advanceId = str(form, "advanceId");
  const role = (str(form, "role") || "Other") as PartyRole;
  await db.insert(schema.partyMembers).values({
    id: nanoid(12),
    advanceId,
    name: str(form, "name"),
    role,
    phone: opt(form, "phone"),
    email: opt(form, "email"),
    dietary: opt(form, "dietary"),
    arrival: opt(form, "arrival"),
    passType: opt(form, "passType") ?? DEFAULT_PASS_BY_ROLE[role] ?? "Working",
    source: (str(form, "source") as "artist" | "venue") || "venue",
  });
  revalidatePath(`/advances/${advanceId}/people`);
}

export async function setPassType(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db
    .update(schema.partyMembers)
    .set({ passType: opt(form, "passType") })
    .where(and(eq(schema.partyMembers.id, str(form, "memberId")), eq(schema.partyMembers.advanceId, advanceId)));
  revalidatePath(`/advances/${advanceId}/people`);
}

export async function removePartyMember(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.delete(schema.partyMembers).where(and(eq(schema.partyMembers.id, str(form, "memberId")), eq(schema.partyMembers.advanceId, advanceId)));
  revalidatePath(`/advances/${advanceId}/people`);
}

export async function addGuest(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.insert(schema.guests).values({
    id: nanoid(12),
    advanceId,
    actName: str(form, "actName"),
    name: str(form, "name"),
    plusOnes: num(form, "plusOnes", 0),
    note: opt(form, "note"),
    addedBy: str(form, "addedBy") || "venue",
    source: (str(form, "source") as "artist" | "venue") || "venue",
    late: str(form, "late") === "1",
  });
  revalidatePath(`/advances/${advanceId}/people`);
  revalidatePath(`/advances/${advanceId}/door`);
}

export async function removeGuest(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.delete(schema.guests).where(and(eq(schema.guests.id, str(form, "guestId")), eq(schema.guests.advanceId, advanceId)));
  revalidatePath(`/advances/${advanceId}/people`);
}

export async function addVehicle(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.insert(schema.vehicles).values({
    id: nanoid(12),
    advanceId,
    kind: str(form, "kind") || "Van",
    plate: opt(form, "plate"),
    driver: opt(form, "driver"),
    phone: opt(form, "phone"),
    arrival: opt(form, "arrival"),
    note: opt(form, "note"),
  });
  revalidatePath(`/advances/${advanceId}/people`);
}

export async function removeVehicle(form: FormData) {
  const advanceId = str(form, "advanceId");
  await db.delete(schema.vehicles).where(and(eq(schema.vehicles.id, str(form, "vehicleId")), eq(schema.vehicles.advanceId, advanceId)));
  revalidatePath(`/advances/${advanceId}/people`);
}

/* ------------------------------------------------------------------ */
/* Artist share link (token-scoped, no login)                          */
/* ------------------------------------------------------------------ */

async function advanceForToken(token: string) {
  const full = await getAdvanceByToken(token);
  if (!full) throw new Error("This link is no longer valid.");
  return full;
}

export async function answerQuestion(form: FormData) {
  const token = str(form, "token");
  const full = await advanceForToken(token);
  const itemId = str(form, "itemId");
  const answer = str(form, "answer");
  if (!answer) return;
  await db
    .update(schema.lineItems)
    .set({ artistAnswer: answer, answeredAt: new Date().toISOString() })
    .where(and(eq(schema.lineItems.id, itemId), eq(schema.lineItems.advanceId, full.advance.id)));
  await db.insert(schema.messages).values({
    id: nanoid(12),
    advanceId: full.advance.id,
    channel: "share",
    direction: "in",
    party: "artist",
    body: `Answered: ${answer}`,
  });
  await refreshStatus(full.advance.id);
  revalidatePath(`/a/${token}`);
  revalidatePath(`/advances/${full.advance.id}`);
}

export async function approveSubstitute(form: FormData) {
  const token = str(form, "token");
  const full = await advanceForToken(token);
  const itemId = str(form, "itemId");
  const approved = str(form, "approved") === "1";
  await db
    .update(schema.lineItems)
    .set({ tmApproved: approved, answeredAt: new Date().toISOString(), artistAnswer: approved ? "Approved by artist side" : "Declined by artist side; venue to revisit" })
    .where(and(eq(schema.lineItems.id, itemId), eq(schema.lineItems.advanceId, full.advance.id)));
  await refreshStatus(full.advance.id);
  revalidatePath(`/a/${token}`);
  revalidatePath(`/advances/${full.advance.id}`);
}

export async function artistAddPartyMember(form: FormData) {
  const token = str(form, "token");
  const full = await advanceForToken(token);
  form.set("advanceId", full.advance.id);
  form.set("source", "artist");
  await addPartyMember(form);
  revalidatePath(`/a/${token}`);
}

export async function artistAddGuest(form: FormData) {
  const token = str(form, "token");
  const full = await advanceForToken(token);
  const late = isPastCutoff(full.advance.showDate, full.advance.doorsTime, full.venue.specPack.compPolicy.cutoffHoursBeforeDoors);
  form.set("advanceId", full.advance.id);
  form.set("source", "artist");
  form.set("addedBy", str(form, "addedBy") || "tour manager");
  form.set("late", late ? "1" : "0");
  if (!str(form, "actName")) form.set("actName", full.artist.name);
  await addGuest(form);
  revalidatePath(`/a/${token}`);
}

export async function artistAddVehicle(form: FormData) {
  const token = str(form, "token");
  const full = await advanceForToken(token);
  form.set("advanceId", full.advance.id);
  await addVehicle(form);
  revalidatePath(`/a/${token}`);
}

