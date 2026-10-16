import type { RiderItem } from "./schemas";

/**
 * House rules the matcher applies. These start as a hand-written list from real
 * advances and should become data as venues override them.
 */
export const MATCH_RULES = `
RULES FOR RESOLVING RIDER LINES AGAINST A VENUE SPEC PACK

States:
- met: the spec pack clearly covers it. Say which part of the pack covers it.
- venue_decides: the venue must choose (buy, rent, substitute, decline, hire). Always propose the best substitute the pack supports.
- ask_artist: the venue cannot resolve it without information from the artist's side (schedules, party size, whether something is still current, which option they prefer, missing documents). Write the exact question.
- rule: a standing instruction with no decision (e.g. "no photographers on stage without approval", "deviations must be cleared with the TM"). Carry it to the day sheet.
- declined: refused on principle regardless of capacity: anything that exposes staff or third parties' personal information (names and phone numbers of dancers, bartenders, staff), anything illegal, anything that violates the venue's stated policies outright.

Judgment:
- A brand list for a PA ("Meyer, L-Acoustics, d&b, Martin") means "a flown line array of that class", not a brand mandate. If the room has a point-source house system, state venue_decides with the house system offered as the substitute; the TM nearly always accepts at club level.
- Riser heights, grounding, power at named positions, and anything the rider says the band "will not perform" without are hard.
- "If possible", "preferred", "ideally" are preferences or wishes; the venue may decline them without TM sign-off.
- Lines marked joke are venue_decides with a note that they are optional goodwill; never treat them as hard. If a joke line says it is "less of a joke than you think", keep it as a wish and say so.
- Requirements written for a much larger room (arena-scale LED walls, pyro, subwoofer ratios by thousands of capacity) are venue_decides, but say in the reason that they belong to the scope conversation rather than a line-by-line decline.
- "No exceptions" equipment named by an old model year is venue_decides with a question about current-generation equivalents attached in suggestedSubstitute.
- Hospitality lines become shopping-list items: venue_decides with the specific purchase in costNote. Alcohol is venue_decides (bar pull or purchase, and legal to serve).
- Hotels, ground transport, buyouts, and per diems are venue_decides because they are deal terms with cost; say "check against the deal memo" in the reason.
- Anything referencing a document that was not provided (stage plot, input list) is ask_artist.
- If the rider's date is more than 18 months old, the first ask_artist should confirm the rider is still current.
- Never invent prices. costNote names the kind of cost (purchase, rental, labor call) in a few words.
- Keep reasons to one sentence. Substitutes are concrete: "house point-source PA, 32-channel digital console, SPL to 105 dBA at FOH" not "something similar".
`.trim();

/** Deterministic refusals applied after the model, so they never depend on it. */
const REFUSAL_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /(names?|numbers?|phone|contact).*(dancers?|bartenders?|servers?|staff|waitress|waiters?)|(dancers?|bartenders?|servers?|staff).*(phone|numbers?|contact)/i,
    reason: "Refused on staff-privacy grounds; the venue does not share employees' or contractors' personal information.",
  },
];

export function forcedRefusal(item: RiderItem): string | null {
  for (const { pattern, reason } of REFUSAL_PATTERNS) {
    if (pattern.test(item.text)) return reason;
  }
  return null;
}

/** Lines whose decline or substitution needs the artist side's sign-off. */
export function needsTmApproval(item: RiderItem): boolean {
  return item.requirement === "hard" || item.requirement === "preferred";
}
