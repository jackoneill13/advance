/**
 * Parse one or more rider files against a spec pack from the command line.
 *
 *   npm run parse -- fixtures/riders/some-rider.pdf
 *   npm run parse -- page1.jpg page2.jpg --spec fixtures/spec-pack.example.json --capacity 300 --out out.json
 *
 * Needs ANTHROPIC_API_KEY in .env.local. Prints a summary and writes the full JSON.
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";

loadEnv();

async function main() {
  const args = process.argv.slice(2);
  const files: string[] = [];
  let spec = "fixtures/spec-pack.example.json";
  let out = "";
  let capacity: number | null = null;
  let venueName = "Spec pack";
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--spec") spec = args[++i];
    else if (a === "--out") out = args[++i];
    else if (a === "--capacity") capacity = Number(args[++i]);
    else if (a === "--venue") venueName = args[++i];
    else files.push(a);
  }
  if (files.length === 0) {
    console.error("Usage: npm run parse -- <rider files...> [--spec spec-pack.json] [--capacity 300] [--out result.json]");
    process.exit(1);
  }

  const { toContentBlocks, mimeFromName } = await import("../src/lib/ingest");
  const { parseRider } = await import("../src/lib/parser");
  const { matchRider } = await import("../src/lib/matcher");
  const { fitCheck } = await import("../src/lib/fitcheck");
  const { SpecPackSchema } = await import("../src/lib/schemas");

  const specPack = SpecPackSchema.parse(JSON.parse(fs.readFileSync(path.resolve(spec), "utf8")));
  if (capacity) specPack.capacity = capacity;

  const ingested = files.map((f) => ({ name: path.basename(f), mimeType: mimeFromName(f), bytes: fs.readFileSync(path.resolve(f)) }));
  const blocks = await toContentBlocks(ingested);

  console.error(`Parsing ${files.length} file(s)…`);
  const t0 = Date.now();
  const parsed = await parseRider(blocks);
  console.error(`Parsed ${parsed.parse.items.length} items in ${((Date.now() - t0) / 1000).toFixed(1)}s (${parsed.usage.input} in / ${parsed.usage.output} out tokens).`);

  const fit = fitCheck(parsed.parse, specPack.capacity);
  console.error(`Fit: ${fit.summary}`);

  const t1 = Date.now();
  const matched = await matchRider({ venueName, specPack, parse: parsed.parse, fit });
  console.error(`Matched in ${((Date.now() - t1) / 1000).toFixed(1)}s (${matched.usage.input} in / ${matched.usage.output} out tokens).`);

  const counts: Record<string, number> = {};
  for (const r of matched.result.resolutions) counts[r.state] = (counts[r.state] ?? 0) + 1;
  console.log("");
  console.log(`${parsed.parse.artist ?? "Unknown artist"} · dated ${parsed.parse.datedOn ?? "n/a"} · deviations: ${parsed.parse.deviationAuthority}`);
  console.log(Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(" · "));
  console.log("");
  for (const r of matched.result.resolutions) {
    const it = parsed.parse.items[r.itemIndex];
    console.log(`[${r.state.padEnd(13)}] (${it.requirement}) ${it.text}`);
    console.log(`               ${r.reason}${r.suggestedSubstitute ? ` → ${r.suggestedSubstitute}` : ""}${r.questionForArtist ? ` ? ${r.questionForArtist}` : ""}`);
  }
  if (matched.result.scopeMessageDraft) {
    console.log("\nScope message draft:\n" + matched.result.scopeMessageDraft);
  }

  const result = { parse: parsed.parse, fit, match: matched.result, models: { parse: parsed.model, match: matched.model }, usage: { parse: parsed.usage, match: matched.usage } };
  if (out) {
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.error(`\nWrote ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
