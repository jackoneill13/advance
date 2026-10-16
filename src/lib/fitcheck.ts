import type { FitCheck, RiderParse } from "./schemas";

/** Ratio of implied-to-actual capacity at which we stop treating lines one by one. */
export const FIT_MISMATCH_RATIO = 3;

export function fitCheck(parse: RiderParse, venueCapacity: number): FitCheck {
  const implied = parse.impliedCapacityMin;
  if (!implied || venueCapacity <= 0) {
    return {
      impliedCapacityMin: implied ?? null,
      venueCapacity,
      ratio: null,
      mismatch: false,
      summary: "No capacity signal in the rider; resolve line by line.",
    };
  }
  const ratio = implied / venueCapacity;
  const mismatch = ratio >= FIT_MISMATCH_RATIO;
  return {
    impliedCapacityMin: implied,
    venueCapacity,
    ratio: Math.round(ratio * 10) / 10,
    mismatch,
    summary: mismatch
      ? `Rider reads as written for rooms of ${implied.toLocaleString()}+; this room is ${venueCapacity.toLocaleString()}. Open with one scope message instead of line-by-line declines.`
      : `Rider scale (${implied.toLocaleString()}+) is within range of this room (${venueCapacity.toLocaleString()}).`,
  };
}
