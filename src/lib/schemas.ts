import { z } from "zod/v4";

/* ------------------------------------------------------------------ */
/* Venue spec pack                                                     */
/* ------------------------------------------------------------------ */

export const SPEC_SECTIONS = [
  ["stage", "Stage & risers", "Dimensions, risers on hand (size, height, skirted), stage height, wings, barricade."],
  ["pa", "PA & FOH", "System type and model, SPL, subs, front fills, processing, FOH console model and position, FOH table."],
  ["monitors", "Monitors, mics & IEM", "Wedges and drum sub, monitor console or FOH-run, wireless mics, wired mics, DIs, stands (boom / straight / short), IEM capability."],
  ["power", "Power & cables", "Circuits by stage position (amps, volts), shore power, distro, cable inventory (XLR 25 ft / 10 ft, TS, snakes, splits)."],
  ["backline", "Backline & DJ gear", "Owned backline, DJ decks and mixer, DJ table, booth riser height, preferred rental house."],
  ["lighting", "Lighting, video & SFX", "Rig, spots, haze, LED wall or projector, video tech, pyro and SFX policy, fire-marshal rules."],
  ["rooms", "Dressing rooms", "Rooms by name: lockable, private bath, shower, climate control, furnishings, capacity."],
  ["hospitality", "Hospitality", "How hospitality is done (in-house, runner, none), preferred stores, bar availability, buyout policy, what you will not provide."],
  ["crew", "Crew & labor", "House sound, lighting, video, backline tech availability; loaders; labor rates; minimum calls."],
  ["loadin", "Load-in, parking & travel", "Dock or door dimensions, path to stage, bus and trailer parking, shore power, nearest hotels, airport distance, transport policy."],
  ["policies", "House policies", "Curfew, sound limit, photographers, merch rate, security staffing, settlement terms, insurance requirements."],
  ["vendors", "Vendors", "Backline rental, AV rental, caterers, hotels, SFX companies, with contacts."],
] as const;

export type SpecSectionKey = (typeof SPEC_SECTIONS)[number][0];

export const CompPolicySchema = z.object({
  headliner: z.number().int().default(10),
  support: z.number().int().default(5),
  cutoffHoursBeforeDoors: z.number().int().default(4),
});

export const SpecPackSchema = z.object({
  capacity: z.number().int().default(300),
  passTypes: z.array(z.string()).default(["All Access", "Working", "Artist Guest", "Photo", "Merch"]),
  compPolicy: CompPolicySchema.default({ headliner: 10, support: 5, cutoffHoursBeforeDoors: 4 }),
  sections: z.record(z.string(), z.string()).default({}),
});
export type SpecPack = z.infer<typeof SpecPackSchema>;

export function emptySpecPack(capacity = 300): SpecPack {
  return SpecPackSchema.parse({ capacity, sections: {} });
}

/* ------------------------------------------------------------------ */
/* Rider parse (structured output from the parser)                     */
/* ------------------------------------------------------------------ */

export const ITEM_CATEGORIES = [
  "hospitality",
  "dressing_room",
  "food_beverage",
  "sound",
  "monitors_iem",
  "power",
  "backline",
  "dj_equipment",
  "staging",
  "lighting",
  "video",
  "sfx",
  "crew",
  "schedule",
  "security",
  "travel_hotel",
  "transport",
  "guest_list",
  "merch",
  "process",
  "other",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const REQUIREMENT_LEVELS = ["hard", "preferred", "wish", "joke", "process"] as const;
export type RequirementLevel = (typeof REQUIREMENT_LEVELS)[number];

export const RiderItemSchema = z.object({
  category: z.enum(ITEM_CATEGORIES),
  text: z.string().describe("The requirement in one sentence, in the rider's own terms"),
  quantity: z.string().nullable().describe("Quantity as written, e.g. '4', '2 cases', null if none"),
  spec: z.string().nullable().describe("Model, brand, size, or standard named, null if none"),
  requirement: z.enum(REQUIREMENT_LEVELS),
  page: z.number().int().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});
export type RiderItem = z.infer<typeof RiderItemSchema>;

export const RiderParseSchema = z.object({
  artist: z.string().nullable(),
  agency: z.string().nullable(),
  datedOn: z.string().nullable().describe("Date the rider says it is current as of, as written"),
  deviationAuthority: z.enum(["agent", "tour_manager", "promoter", "unspecified"]),
  partySizeInferred: z.number().int().nullable(),
  impliedCapacityMin: z
    .number()
    .int()
    .nullable()
    .describe("Smallest venue capacity this rider appears written for, inferred from PA scale, subwoofer ratios, LED walls, pyro; null if no signal"),
  missingReferencedDocs: z.array(z.string()).describe("Documents the rider refers to that are not in what was provided, e.g. stage plot"),
  contradictions: z.array(z.string()).describe("Lines in the rider that conflict with each other"),
  contactRoles: z.array(z.string()).describe("Roles named as contacts, e.g. 'tour manager', 'agent'; names only, never phone numbers or emails"),
  items: z.array(RiderItemSchema),
});
export type RiderParse = z.infer<typeof RiderParseSchema>;

/* ------------------------------------------------------------------ */
/* Match result (structured output from the matcher)                   */
/* ------------------------------------------------------------------ */

export const ITEM_STATES = ["met", "venue_decides", "ask_artist", "rule", "declined"] as const;
export type ItemState = (typeof ITEM_STATES)[number];

export const ResolutionSchema = z.object({
  itemIndex: z.number().int(),
  state: z.enum(ITEM_STATES),
  reason: z.string().describe("One sentence: why this state, citing the spec pack where relevant"),
  suggestedSubstitute: z.string().nullable().describe("What the venue could offer instead, if state is venue_decides"),
  questionForArtist: z.string().nullable().describe("The exact question to send the artist, if state is ask_artist"),
  costNote: z.string().nullable().describe("Purchase, rental, or labor implied, in a few words; no invented prices"),
});
export type Resolution = z.infer<typeof ResolutionSchema>;

export const MatchResultSchema = z.object({
  scopeMessageDraft: z
    .string()
    .nullable()
    .describe("If the rider is written for a much larger room, a short message to the artist's representative proposing house production; else null"),
  resolutions: z.array(ResolutionSchema),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

export type FitCheck = {
  impliedCapacityMin: number | null;
  venueCapacity: number;
  ratio: number | null;
  mismatch: boolean;
  summary: string;
};

export const DECISIONS = ["accept", "substitute", "decline", "answered", "noted"] as const;
export type Decision = (typeof DECISIONS)[number];

export const PARTY_ROLES = [
  "Artist",
  "Tour manager",
  "FOH engineer",
  "Monitor engineer",
  "Lighting",
  "VJ / video",
  "Backline tech",
  "Merch",
  "Driver",
  "Photographer",
  "Security",
  "Guest",
  "Other",
] as const;
export type PartyRole = (typeof PARTY_ROLES)[number];

export const DEFAULT_PASS_BY_ROLE: Record<PartyRole, string> = {
  Artist: "All Access",
  "Tour manager": "All Access",
  "FOH engineer": "Working",
  "Monitor engineer": "Working",
  Lighting: "Working",
  "VJ / video": "Working",
  "Backline tech": "Working",
  Merch: "Merch",
  Driver: "Working",
  Photographer: "Photo",
  Security: "Working",
  Guest: "Artist Guest",
  Other: "Artist Guest",
};
