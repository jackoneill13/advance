import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.example), or run `npm run seed` to load the demo advance without an API key.",
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

export const MODELS = {
  parse: process.env.PARSE_MODEL ?? "claude-sonnet-5-5",
  match: process.env.MATCH_MODEL ?? "claude-sonnet-5-5",
  chase: process.env.CHASE_MODEL ?? "claude-haiku-5-5",
};

/** Hard ceiling on tokens we will spend on a single advance, so a loop never runs up a bill. */
export const MAX_OUTPUT_TOKENS_PER_CALL = 16_000;
