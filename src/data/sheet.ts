import type { FlagSize, SheetFormat } from "../types/flag";

/** Largest cloth: 40 cm on the fly, 30 cm on the hoist. */
export const maxFlagLengthCm = 40;
export const maxFlagHeightCm = 30;

export const flagSizes: readonly FlagSize[] = [
  {
    id: "40x30",
    lengthCm: maxFlagLengthCm,
    heightCm: maxFlagHeightCm,
    label: "max 40 × 30 cm",
  },
];

export const defaultFlagSize = flagSizes[0];

/** How many flags sit on one printed sheet. */
export const sheetFormats: readonly SheetFormat[] = [
  { id: "2x2", columns: 2, rows: 2, label: "2 × 2" },
  { id: "3x4", columns: 3, rows: 4, label: "3 × 4" },
  { id: "4x5", columns: 4, rows: 5, label: "4 × 5" },
];

export const defaultSheetFormat = sheetFormats[2];
