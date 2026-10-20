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
  region: Region;
};

export const regions = [
  "Nordic",
  "Baltic",
  "North Sea",
  "Atlantic",
  "Mediterranean",
] as const;

export type Region = (typeof regions)[number];

export type FlagSize = {
  id: string;
  lengthCm: number;
  heightCm: number;
  label: string;
};

export type SheetFormat = {
  id: string;
  columns: number;
  rows: number;
  label: string;
};
