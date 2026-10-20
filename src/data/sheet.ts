import type { FlagSize, SheetFormat } from "../types/flag";

/** Cloth size for every flag on the sheet. More presets can be added later. */
export const flagSizes: readonly FlagSize[] = [
  { id: "30x40", widthCm: 30, heightCm: 40, label: "30 × 40 cm" },
];

export const defaultFlagSize = flagSizes[0];

/** How many flags sit on one printed sheet. */
export const sheetFormats: readonly SheetFormat[] = [
  { id: "2x2", columns: 2, rows: 2, label: "2 × 2" },
  { id: "3x4", columns: 3, rows: 4, label: "3 × 4" },
  { id: "4x5", columns: 4, rows: 5, label: "4 × 5" },
];

export const defaultSheetFormat = sheetFormats[2];
