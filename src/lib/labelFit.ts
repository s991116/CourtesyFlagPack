import { printLayout } from "../config/print";

/**
 * Source Sans Pro ink, in em.
 * `d` reaches 0.712 above the baseline. `g` reaches 0.224 below it.
 */
export const labelAscentEm = 0.712;
export const labelDescentEm = 0.224;

/**
 * White stroke drawn under the black letters, in em.
 * Only the outer half shows, as a thin edge. A thicker stroke would cover the fill.
 */
export const labelOutlineEm = 0.04;

/**
 * Letter size for the country name in the left fold.
 * About a tenth of the fold stays clear of the white outline, above a tall
 * letter and below g. The name also stays within the flag plus the folds
 * above and below.
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
  const inkPerEm = labelAscentEm + labelDescentEm + labelOutlineEm;
  const inkBudget = Math.min(hemWidthMm, hemWidthMm * coverage);
  const byInk = inkBudget / inkPerEm;
  const byLength = maxLengthMm / (textWidthPerMm + labelOutlineEm);
  return Math.min(byInk, byLength);
}

/** Distance from the cut edge to the baseline, so g stays inside the fold. */
export function labelBaselineFromCutMm(hemMm: number, fontMm: number): number {
  const ascentMm = fontMm * labelAscentEm;
  const descentMm = fontMm * labelDescentEm;
  const slack = Math.max(0, hemMm - ascentMm - descentMm);
  return slack / 2 + ascentMm;
}
