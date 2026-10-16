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
  // A confirmed schedule and a couple of venue staff so the day-of-show sheet is populated.
  const { defaultSchedule } = await import("../src/lib/scheduler");
  const schedule = defaultSchedule("19:00", specPack);
  schedule.times.loadIn = "16:00";
  schedule.notes.loadIn = "per rider: 3 h before doors";
  schedule.times.backlineArrives = "15:30";
  schedule.notes.backlineArrives = "Valley Backline with tech";
  schedule.times.soundcheckHeadliner = "17:00";
  schedule.notes.soundcheckHeadliner = "per rider: 60 min minimum";
  schedule.times.soundcheckSupport = "18:10";
  schedule.times.dinner = "18:00";
  schedule.notes.dinner = "Boboko delivery, 8 meals (1 vegan, 1 GF)";
  schedule.times.supportSet = "20:00";
  schedule.notes.supportSet = "35 min";
  schedule.times.changeover = "20:35";
  schedule.times.headlinerSet = "21:00";
  schedule.notes.headlinerSet = "75 min, no strobes in the acoustic set";
  schedule.times.loadOut = "22:30";
  schedule.times.settlement = "22:45";
  await db
    .update(schema.advances)
    .set({ schedule, scheduleConfirmedAt: new Date().toISOString(), dosNotes: "Van and trailer park behind the venue; two spaces. Runner is on site from 3 pm. Green room key with the stage manager." })
    .where(eq(schema.advances.id, advanceId));
  await db.insert(schema.venueStaff).values([
    { id: nanoid(12), advanceId, name: "Dana Whitfield", role: "Production manager", phone: "555-0142", callTime: "15:00" },
    { id: nanoid(12), advanceId, name: "Marcus Bell", role: "House sound", phone: "555-0177", callTime: "15:00" },
    { id: nanoid(12), advanceId, name: "Priya Nair", role: "Door", phone: null, callTime: "18:30" },
  ]);
  console.log(`Seeded demo advance: http://localhost:3000/advances/${advanceId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
