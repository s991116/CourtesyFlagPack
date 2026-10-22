import { describe, expect, it } from "vitest";
import {
  fittedLabelFontMm,
  helveticaAscentEm,
  helveticaDescentEm,
  labelBaselineFromCutMm,
  labelOutlineEm,
} from "./labelFit";

function outlineClearance(hem: number, font: number) {
  const baseline = labelBaselineFromCutMm(hem, font);
  const halo = (font * labelOutlineEm) / 2;
  return {
    clearOfCut: baseline - font * helveticaAscentEm - halo,
    clearOfFold: hem - (baseline + font * helveticaDescentEm + halo),
  };
}

describe("label size", () => {
  it("leaves about 10% of the fold clear of the white outline", () => {
    const hem = 20;
    const font = fittedLabelFontMm(hem, 340, 5);
    const { clearOfCut, clearOfFold } = outlineClearance(hem, font);

    expect(clearOfCut / hem).toBeCloseTo(0.1);
    expect(clearOfFold / hem).toBeCloseTo(0.1);
  });

  it("shrinks the letters when the name would be longer than the flag including the folds", () => {
    expect(fittedLabelFontMm(20, 40, 5)).toBeCloseTo(40 / (5 + labelOutlineEm));
    expect(fittedLabelFontMm(20, 0, 5)).toBe(0);
  });

  it("shrinks the letters when a descender would leave the fold", () => {
    const hem = 20;
    const font = fittedLabelFontMm(hem, 10_000, 0.2, 2);
    expect(font * (helveticaAscentEm + helveticaDescentEm + labelOutlineEm)).toBeCloseTo(hem);
    expect(font).toBeLessThan(hem * 2);
  });

  it("keeps a shortened name at least 10% clear of both lines", () => {
    const hem = 20;
    const font = fittedLabelFontMm(hem, 40, 5);
    const { clearOfCut, clearOfFold } = outlineClearance(hem, font);
    const minimum = hem * 0.1;

    expect(clearOfCut).toBeGreaterThanOrEqual(minimum);
    expect(clearOfFold).toBeGreaterThanOrEqual(minimum);
  });
});
