import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ItemState } from "./schemas";

export async function listVenues() {
  return db.query.venues.findMany({ orderBy: [asc(schema.venues.name)] });
}

export async function getVenue(id: string) {
  return db.query.venues.findFirst({ where: eq(schema.venues.id, id) });
}

export async function listAdvances() {
  const rows = await db
    .select({
      id: schema.advances.id,
      title: schema.advances.title,
      showDate: schema.advances.showDate,
      status: schema.advances.status,
      createdAt: schema.advances.createdAt,
      venueName: schema.venues.name,
      artistName: schema.artists.name,
    })
    .from(schema.advances)
    .innerJoin(schema.venues, eq(schema.advances.venueId, schema.venues.id))
    .innerJoin(schema.artists, eq(schema.advances.artistId, schema.artists.id))
    .orderBy(desc(schema.advances.createdAt));
  const counts = await Promise.all(rows.map((r) => openCounts(r.id)));
  return rows.map((r, i) => ({ ...r, ...counts[i] }));
}

export async function openCounts(advanceId: string) {
  const items = await db.query.lineItems.findMany({ where: eq(schema.lineItems.advanceId, advanceId) });
  const open = items.filter((it) => isOpen(it)).length;
  const byState: Record<ItemState, number> = { met: 0, venue_decides: 0, ask_artist: 0, rule: 0, declined: 0 };
  for (const it of items) byState[it.state] += 1;
  return { total: items.length, open, byState };
}

export function isOpen(it: schema.LineItem): boolean {
  if (it.state === "venue_decides") return !it.decision || (it.tmApprovalRequired && it.decision !== "accept" && !it.tmApproved);
  if (it.state === "ask_artist") return !it.artistAnswer;
  return false;
}

export async function getAdvanceFull(id: string) {
  const advance = await db.query.advances.findFirst({ where: eq(schema.advances.id, id) });
  if (!advance) return null;
  const [venue, artist, rider, items, party, guestRows, vehicleRows, messageRows, staffRows] = await Promise.all([
    db.query.venues.findFirst({ where: eq(schema.venues.id, advance.venueId) }),
    db.query.artists.findFirst({ where: eq(schema.artists.id, advance.artistId) }),
    advance.riderId ? db.query.riders.findFirst({ where: eq(schema.riders.id, advance.riderId) }) : Promise.resolve(undefined),
    db.query.lineItems.findMany({ where: eq(schema.lineItems.advanceId, id), orderBy: [asc(schema.lineItems.idx)] }),
    db.query.partyMembers.findMany({ where: eq(schema.partyMembers.advanceId, id), orderBy: [asc(schema.partyMembers.createdAt)] }),
    db.query.guests.findMany({ where: eq(schema.guests.advanceId, id), orderBy: [asc(schema.guests.actName), asc(schema.guests.name)] }),
    db.query.vehicles.findMany({ where: eq(schema.vehicles.advanceId, id), orderBy: [asc(schema.vehicles.createdAt)] }),
    db.query.messages.findMany({ where: eq(schema.messages.advanceId, id), orderBy: [desc(schema.messages.createdAt)] }),
    db.query.venueStaff.findMany({ where: eq(schema.venueStaff.advanceId, id), orderBy: [asc(schema.venueStaff.callTime), asc(schema.venueStaff.name)] }),
  ]);
  if (!venue || !artist) return null;
  return {
    advance,
    venue,
    artist,
    rider: rider ?? null,
    items,
    party,
    guests: guestRows,
    vehicles: vehicleRows,
    messages: messageRows,
    staff: staffRows,
  };
}

export type AdvanceFull = NonNullable<Awaited<ReturnType<typeof getAdvanceFull>>>;

export async function getAdvanceByToken(token: string) {
  const advance = await db.query.advances.findFirst({ where: eq(schema.advances.shareToken, token) });
  if (!advance) return null;
  return getAdvanceFull(advance.id);
}

export function guestAllocation(
  pack: schema.Venue["specPack"],
  guestList: schema.Guest[],
  headlinerName: string,
): Array<{ act: string; used: number; allowed: number }> {
  const acts = new Map<string, number>();
  for (const g of guestList) acts.set(g.actName, (acts.get(g.actName) ?? 0) + 1 + g.plusOnes);
  if (!acts.has(headlinerName)) acts.set(headlinerName, 0);
  return [...acts.entries()].map(([act, used]) => ({
    act,
    used,
    allowed: act === headlinerName ? pack.compPolicy.headliner : pack.compPolicy.support,
  }));
}
