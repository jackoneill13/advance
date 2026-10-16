import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, MODELS, MAX_OUTPUT_TOKENS_PER_CALL } from "./anthropic";
import { MATCH_RULES, forcedRefusal } from "./rules";
import { SPEC_SECTIONS, MatchResultSchema, type FitCheck, type MatchResult, type RiderParse, type SpecPack } from "./schemas";

export function specPackAsText(name: string, pack: SpecPack): string {
  const lines: string[] = [`VENUE SPEC PACK: ${name}`, `Capacity: ${pack.capacity}`];
  lines.push(`Pass types: ${pack.passTypes.join(", ")}`);
  lines.push(
    `Comp policy: ${pack.compPolicy.headliner} headliner, ${pack.compPolicy.support} per support act, cutoff ${pack.compPolicy.cutoffHoursBeforeDoors} h before doors`,
  );
  for (const [key, label] of SPEC_SECTIONS) {
    const body = pack.sections[key]?.trim();
    lines.push("", `## ${label}`, body && body.length > 0 ? body : "(not provided)");
  }
  return lines.join("\n");
}

export type MatchOutcome = {
  result: MatchResult;
  model: string;
  usage: { input: number; output: number; cacheRead: number };
};

export async function matchRider(args: {
  venueName: string;
  specPack: SpecPack;
  parse: RiderParse;
  fit: FitCheck;
}): Promise<MatchOutcome> {
  const client = anthropic();
  const { venueName, specPack, parse, fit } = args;

  const riderForModel = {
    artist: parse.artist,
    datedOn: parse.datedOn,
    deviationAuthority: parse.deviationAuthority,
    partySizeInferred: parse.partySizeInferred,
    impliedCapacityMin: parse.impliedCapacityMin,
    missingReferencedDocs: parse.missingReferencedDocs,
    contradictions: parse.contradictions,
    items: parse.items.map((it, i) => ({ index: i, ...it })),
  };

  const message = await client.messages.parse({
    model: MODELS.match,
    max_tokens: MAX_OUTPUT_TOKENS_PER_CALL,
    system: [
      { type: "text", text: MATCH_RULES, cache_control: { type: "ephemeral" } },
      { type: "text", text: specPackAsText(venueName, specPack), cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Fit check: ${fit.summary}\n\n` +
              `Resolve every item below against the spec pack. Return exactly one resolution per item, using the item's index. ` +
              `${fit.mismatch ? "The rider is written for a much larger room, so also draft a short scope message to the artist's representative proposing house production and listing what the room provides; keep it under 120 words." : "Set scopeMessageDraft to null."}\n\n` +
              JSON.stringify(riderForModel, null, 1),
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(MatchResultSchema) },
  });

  const result = message.parsed_output;
  if (!result) throw new Error("The matcher returned no structured output; try again.");

  // Deterministic overrides: refusals never depend on the model, and every item gets a resolution.
  const byIndex = new Map(result.resolutions.map((r) => [r.itemIndex, r]));
  const resolutions = parse.items.map((item, i) => {
    const refusal = forcedRefusal(item);
    const r = byIndex.get(i) ?? {
      itemIndex: i,
      state: "venue_decides" as const,
      reason: "The matcher did not return a resolution for this line; review it by hand.",
      suggestedSubstitute: null,
      questionForArtist: null,
      costNote: null,
    };
    if (refusal) {
      return { ...r, itemIndex: i, state: "declined" as const, reason: refusal, suggestedSubstitute: null, questionForArtist: null };
    }
    return { ...r, itemIndex: i };
  });

  const usage = message.usage;
  return {
    result: { scopeMessageDraft: result.scopeMessageDraft, resolutions },
    model: MODELS.match,
    usage: {
      input: usage.input_tokens,
      output: usage.output_tokens,
      cacheRead: usage.cache_read_input_tokens ?? 0,
    },
  };
}
