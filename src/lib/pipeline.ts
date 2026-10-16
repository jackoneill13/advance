import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { toContentBlocks, type IngestedFile } from "./ingest";
import { parseRider } from "./parser";
import { matchRider } from "./matcher";
import { fitCheck } from "./fitcheck";
import { needsTmApproval } from "./rules";
import type { FitCheck, MatchResult, RiderParse } from "./schemas";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

export async function findOrCreateArtist(name: string, agency?: string | null) {
  const existing = await db.query.artists.findFirst({ where: eq(schema.artists.name, name) });
  if (existing) return existing;
  const id = nanoid(12);
  await db.insert(schema.artists).values({ id, name, agency: agency ?? null });
  return (await db.query.artists.findFirst({ where: eq(schema.artists.id, id) }))!;
}

export function saveUploads(files: IngestedFile[]): string[] {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return files.map((f) => {
    const safe = f.name.replace(/[^A-Za-z0-9._-]+/g, "_");
    const p = path.join(UPLOAD_DIR, `${nanoid(8)}-${safe}`);
    fs.writeFileSync(p, f.bytes);
    return p;
  });
}

/** Writes the rider, advance, and line items. Shared by the live pipeline and the demo seed. */
export async function persistAdvance(args: {
  venueId: string;
  artistName: string;
  title: string;
  showDate: string | null;
  doorsTime: string | null;
  filenames: string[];
  storagePaths: string[];
  parse: RiderParse;
  parseModel: string | null;
  fit: FitCheck;
  match: MatchResult;
  matchModel: string | null;
}): Promise<string> {
  const artist = await findOrCreateArtist(args.parse.artist ?? args.artistName, args.parse.agency);
  const riderId = nanoid(12);
  const now = new Date().toISOString();
  await db.insert(schema.riders).values({
    id: riderId,
    artistId: artist.id,
    filenames: args.filenames,
    storagePaths: args.storagePaths,
    parsed: args.parse,
    parsedAt: now,
    parseModel: args.parseModel,
  });

  const advanceId = nanoid(12);
  await db.insert(schema.advances).values({
    id: advanceId,
    venueId: args.venueId,
    artistId: artist.id,
    riderId,
    title: args.title,
    showDate: args.showDate,
    doorsTime: args.doorsTime,
    status: "open",
    shareToken: nanoid(21),
    fit: args.fit,
    scopeMessage: args.match.scopeMessageDraft,
    matchModel: args.matchModel,
  });

  const byIndex = new Map(args.match.resolutions.map((r) => [r.itemIndex, r]));
  const rows = args.parse.items.map((item, idx) => {
    const r = byIndex.get(idx)!;
    return {
      id: nanoid(12),
      advanceId,
      idx,
      category: item.category,
      text: item.text,
      quantity: item.quantity,
      spec: item.spec,
      requirement: item.requirement,
      page: item.page,
      confidence: item.confidence,
      state: r.state,
      reason: r.reason,
      suggestedSubstitute: r.suggestedSubstitute,
      questionForArtist: r.questionForArtist,
      costNote: r.costNote,
      tmApprovalRequired: r.state === "venue_decides" && needsTmApproval(item),
    };
  });
  if (rows.length) await db.insert(schema.lineItems).values(rows);

  // Seed the roster with a count if the rider implies one, so the venue sees the gap.
  if (args.parse.partySizeInferred && args.parse.partySizeInferred > 0) {
    await db.insert(schema.messages).values({
      id: nanoid(12),
      advanceId,
      channel: "note",
      direction: "in",
      party: "parser",
      body: `Rider implies a traveling party of ${args.parse.partySizeInferred}. Roster requested from the artist.`,
    });
  }
  return advanceId;
}

export async function runAdvancePipeline(args: {
  venueId: string;
  artistName: string;
  title: string;
  showDate: string | null;
  doorsTime: string | null;
  files: IngestedFile[];
}): Promise<{ advanceId: string; usage: { input: number; output: number; cacheRead: number } }> {
  const venue = await db.query.venues.findFirst({ where: eq(schema.venues.id, args.venueId) });
  if (!venue) throw new Error("Venue not found.");

  const blocks = await toContentBlocks(args.files);
  const storagePaths = saveUploads(args.files);

  const parsed = await parseRider(blocks);
  const fit = fitCheck(parsed.parse, venue.specPack.capacity || venue.capacity);
  const matched = await matchRider({ venueName: venue.name, specPack: venue.specPack, parse: parsed.parse, fit });

  const advanceId = await persistAdvance({
    venueId: venue.id,
    artistName: args.artistName,
    title: args.title,
    showDate: args.showDate,
    doorsTime: args.doorsTime,
    filenames: args.files.map((f) => f.name),
    storagePaths,
    parse: parsed.parse,
    parseModel: parsed.model,
    fit,
    match: matched.result,
    matchModel: matched.model,
  });

  return {
    advanceId,
    usage: {
      input: parsed.usage.input + matched.usage.input,
      output: parsed.usage.output + matched.usage.output,
      cacheRead: parsed.usage.cacheRead + matched.usage.cacheRead,
    },
  };
}
