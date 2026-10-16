import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";

loadEnv();

async function main() {
  const { nanoid } = await import("nanoid");
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("../src/db");
  const { SpecPackSchema, RiderParseSchema, MatchResultSchema } = await import("../src/lib/schemas");
  const { fitCheck } = await import("../src/lib/fitcheck");
  const { persistAdvance } = await import("../src/lib/pipeline");

  const read = (p: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), p), "utf8"));
  const specPack = SpecPackSchema.parse(read("fixtures/spec-pack.example.json"));
  const parse = RiderParseSchema.parse(read("fixtures/demo/parse.json"));
  const match = MatchResultSchema.parse(read("fixtures/demo/match.json"));

  const venueName = "The Example Room";
  let venue = await db.query.venues.findFirst({ where: eq(schema.venues.name, venueName) });
  if (!venue) {
    const id = nanoid(12);
    await db.insert(schema.venues).values({ id, name: venueName, city: "Harrisonburg, VA", capacity: specPack.capacity, specPack });
    venue = (await db.query.venues.findFirst({ where: eq(schema.venues.id, id) }))!;
    console.log(`Created venue "${venueName}" with the example spec pack.`);
  } else {
    console.log(`Venue "${venueName}" already exists; reusing it.`);
  }

  const existing = await db
    .select({ id: schema.advances.id })
    .from(schema.advances)
    .where(eq(schema.advances.title, "The Harbor Lights (demo)"));
  if (existing.length) {
    console.log(`Demo advance already exists: /advances/${existing[0].id}`);
    return;
  }

  const showDate = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const advanceId = await persistAdvance({
    venueId: venue.id,
    artistName: parse.artist ?? "The Harbor Lights",
    title: "The Harbor Lights (demo)",
    showDate,
    doorsTime: "19:00",
    filenames: ["rider.md"],
    storagePaths: ["fixtures/demo/rider.md"],
    parse,
    parseModel: null,
    fit: fitCheck(parse, specPack.capacity),
    match,
    matchModel: null,
  });
  console.log(`Seeded demo advance: http://localhost:3000/advances/${advanceId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
