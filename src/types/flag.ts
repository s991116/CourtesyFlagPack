/**
 * Metadata for one courtesy flag.
 *
 * Artwork lives in the repo (`asset.svg`). `ratio` is the official
 * hoist:fly proportion and can differ from the SVG viewBox. One artwork
 * can cover several names via `labels`; `hemLabel` is the line that will
 * be printed along the edge.
 *
 * Print-only fields (hem width, cut sheet, PDF asset) stay out of this
 * record until the sheet layout needs them.
 */
export type Flag = {
  id: string;
  /** ISO 3166-1 alpha-2 when the flag maps to one code. */
  iso: string;
  labels: readonly string[];
  hemLabel: string;
  ratio: {
    /** Hoist, the vertical side of the official proportion. */
    height: number;
    /** Fly, the horizontal side of the official proportion. */
    length: number;
  };
  asset: {
    svg: string;
  };
  /** Sailing area used by the picker filter. Omitted for a special flag. */
  region?: Region;
  /**
   * National is the courtesy flag for that place.
   * Regional is an optional flag flown in addition to the national one.
   * Special covers quarantine, diver-down, distress, and the signal flags.
   * `detail` is the text after "Special - " on those cards.
   */
  kind: FlagKind;
  detail?: string;
  /** Swallowtail flags are cut to that outline. Omitted flags are rectangles. */
  shape?: FlagShape;
  /** Other places whose courtesy flag is this same flag. */
  also?: readonly string[];
};

export type FlagShape = "swallowtail";

export const regions = [
  "Europe",
  "Caribbean",
  "North America",
  "South America",
  "Oceania",
  "Indian Ocean",
  "Asia",
  "Africa",
] as const;

export type Region = (typeof regions)[number];

export const flagKinds = ["national", "regional", "special"] as const;

export type FlagKind = (typeof flagKinds)[number];
