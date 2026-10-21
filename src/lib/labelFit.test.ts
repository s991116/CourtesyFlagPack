import { describe, expect, it } from "vitest";
import { fittedLabelFontMm } from "./labelFit";

describe("label size", () => {
  it("fills 90% of the fold width when the name fits", () => {
    expect(fittedLabelFontMm(20, 340, 5)).toBeCloseTo(18);
  });

  it("shrinks the letters when the name would be longer than the flag including the folds", () => {
    expect(fittedLabelFontMm(20, 40, 5)).toBeCloseTo(8);
    expect(fittedLabelFontMm(20, 0, 5)).toBe(0);
  });
});
