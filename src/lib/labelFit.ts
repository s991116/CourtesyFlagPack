import { printLayout } from "../config/print";

/**
 * Letter size for the country name in the left fold.
 * The letters fill most of the fold's width, and the name stays
 * within the flag plus the folds above and below.
 */
export function fittedLabelFontMm(
  hemWidthMm: number,
  maxLengthMm: number,
  textWidthPerMm: number,
  coverage: number = printLayout.labelCoverage,
): number {
  if (hemWidthMm <= 0 || maxLengthMm <= 0 || textWidthPerMm <= 0 || coverage <= 0) {
    return 0;
  }
  const preferredMm = hemWidthMm * coverage;
  const lengthAtPreferred = preferredMm * textWidthPerMm;
  if (lengthAtPreferred <= maxLengthMm) return preferredMm;
  return maxLengthMm / textWidthPerMm;
}
