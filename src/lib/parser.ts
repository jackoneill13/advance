import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, MODELS, MAX_OUTPUT_TOKENS_PER_CALL } from "./anthropic";
import { RiderParseSchema, ITEM_CATEGORIES, type RiderParse } from "./schemas";

const PARSER_SYSTEM = `
You read artist riders (technical and hospitality) for live music venues and turn them into a structured checklist a production manager can act on.

Produce one item per distinct requirement. Split compound lines when the venue would act on the parts separately (a shopping list of twelve drinks is twelve items; "two straight stands and five boom stands" is two items). Keep the rider's own words in "text", quoted or lightly condensed, never embellished.

Categories: ${ITEM_CATEGORIES.join(", ")}.

Requirement levels:
- hard: stated as mandatory, "must", "no exceptions", "will not perform without", or a safety item (grounding, barricade, SFX control).
- preferred: a brand list, "or similar", "or equivalent", a stated preference.
- wish: "if possible", "ideally", "would be nice", clearly optional comfort items.
- joke: items that are plainly not meant literally (fantasy objects, celebrities' belongings, live animals). If the rider says a joke item is "less of a joke than you think", mark it wish, not joke.
- process: instructions about how the advance or show runs (approvals, who to contact, sign and return, exclusivity of consoles, photographers).

Page: the page number the line appears on, if you can tell.
Confidence: low when the scan is hard to read, the line is ambiguous, or you had to infer quantity or spec.

Also report: the artist and agency names, the date the rider says it is current as of (as written), who must clear deviations (agent, tour_manager, promoter, unspecified), the party size if it can be inferred (meal counts, hotel rooms), the smallest venue capacity the rider appears written for (from subwoofer ratios, LED wall sizes, pyro, SPL at FOH; null if no signal), documents it references that were not provided, lines that contradict each other, and the roles of any contacts listed. Never output phone numbers or email addresses anywhere.
`.trim();

export type ParseOutcome = {
  parse: RiderParse;
  model: string;
  usage: { input: number; output: number; cacheRead: number };
};

export async function parseRider(blocks: ContentBlockParam[]): Promise<ParseOutcome> {
  const client = anthropic();
  const message = await client.messages.parse({
    model: MODELS.parse,
    max_tokens: MAX_OUTPUT_TOKENS_PER_CALL,
    system: [{ type: "text", text: PARSER_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          ...blocks,
          {
            type: "text",
            text: "Parse this rider into the checklist. Include every line a venue would have to act on, including hospitality and process lines.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(RiderParseSchema) },
  });

  const parse = message.parsed_output;
  if (!parse) throw new Error("The parser returned no structured output; try again or check the file.");
  const usage = message.usage;
  return {
    parse,
    model: MODELS.parse,
    usage: {
      input: usage.input_tokens,
      output: usage.output_tokens,
      cacheRead: usage.cache_read_input_tokens ?? 0,
    },
  };
}
