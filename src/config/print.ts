/**
 * Print-sheet measurements, in millimetres.
 * The finished flag keeps the size from `fittedFlagSize`.
 * Hem is the cloth folded in around that size.
 */
export const printLayout = {
  /** Cloth folded in on every side of the finished flag. */
  hemMm: 20,
  /** Gap between cut pieces. The fold cloth sits inside each piece, not in this gap. */
  gutterMm: 8,
  /** Margin from the page edge to the outer cut pieces. */
  outerMarginMm: 8,
  /**
   * Share of the left fold used by the letters, from the top of a tall letter
   * to the tail of g. The rest is clear: half toward the cut, half toward the fold.
   */
  labelCoverage: 0.8,
  /** Cut line around each flag. */
  cutStrokeMm: 2,
  cutDashMm: 2.5,
  cutGapMm: 2.5,
  /** Fold line along each flag edge. */
  foldStrokeMm: 1,
  foldDashMm: 1.5,
  foldGapMm: 1.5,
} as const;

export type PrintLayout = {
  hemMm: number;
  gutterMm: number;
  outerMarginMm: number;
  labelCoverage: number;
  cutStrokeMm: number;
  cutDashMm: number;
  cutGapMm: number;
  foldStrokeMm: number;
  foldDashMm: number;
  foldGapMm: number;
};
