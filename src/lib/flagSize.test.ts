import { describe, expect, it } from "vitest";
import { flags } from "../data/flags";
import { maxFlagHeightCm, maxFlagLengthCm } from "../data/sheet";
import type { Flag } from "../types/flag";
import { fittedFlagSize } from "./flagSize";

function flag(height: number, length: number): Flag {
  return {
    id: "test",
    iso: "tt",
    labels: ["Test"],
    hemLabel: "Test",
    ratio: { height, length },
    asset: { svg: "/flags/test.svg" },
    region: "Nordic",
  };
}

describe("fitted flag size", () => {
  it("keeps the official ratio inside 40 cm by 30 cm", () => {
    for (const item of flags) {
      const size = fittedFlagSize(item);
      expect(size.lengthCm).toBeLessThanOrEqual(maxFlagLengthCm + 1e-9);
      expect(size.heightCm).toBeLessThanOrEqual(maxFlagHeightCm + 1e-9);
      expect(size.lengthCm / size.heightCm).toBeCloseTo(
        item.ratio.length / item.ratio.height,
      );
      const usedLength = size.lengthCm / maxFlagLengthCm;
      const usedHeight = size.heightCm / maxFlagHeightCm;
      expect(Math.max(usedLength, usedHeight)).toBeCloseTo(1);
    }
  });

  it("uses the full length when the flag is wider than the box", () => {
    expect(fittedFlagSize(flag(1, 2))).toEqual({ lengthCm: 40, heightCm: 20 });
    expect(fittedFlagSize(flag(5, 8))).toEqual({ lengthCm: 40, heightCm: 25 });
  });

  it("uses the full height when the flag is taller than the box", () => {
    const denmark = fittedFlagSize(flag(28, 37));
    expect(denmark.heightCm).toBeCloseTo(30);
    expect(denmark.lengthCm).toBeCloseTo(39.642857);
  });
});
