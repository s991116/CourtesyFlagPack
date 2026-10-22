import { describe, expect, it } from "vitest";
import { flags } from "../data/flags";
import { maxFlagHeightCm, maxFlagLengthCm } from "../data/sheet";
import type { Flag } from "../types/flag";
import { artworkSize, catalogFlagStyle, fittedFlagSize } from "./flagSize";

function flag(height: number, length: number): Flag {
  return {
    id: "test",
    iso: "tt",
    labels: ["Test"],
    hemLabel: "Test",
    ratio: { height, length },
    asset: { svg: "/flags/test.svg" },
    region: "Europe",
    kind: "national",
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

  it("fills 30 cm by 40 cm when the original ratio is off", () => {
    expect(artworkSize(flag(1, 2), "fixed")).toEqual({
      heightCm: 30,
      lengthCm: 40,
    });
    expect(artworkSize(flag(28, 37), "fixed")).toEqual({
      heightCm: 30,
      lengthCm: 40,
    });
    expect(artworkSize(flag(1, 2), "original")).toEqual({
      heightCm: 20,
      lengthCm: 40,
    });
  });

  it("shrinks catalog flags that are taller than Albania", () => {
    const albania = flags.find((item) => item.id === "al");
    const switzerland = flags.find((item) => item.id === "ch");
    const unitedKingdom = flags.find((item) => item.id === "gb");
    if (!albania || !switzerland || !unitedKingdom) {
      throw new Error("missing catalog flag");
    }
    const stage = fittedFlagSize(albania).heightCm;

    expect(catalogFlagStyle(albania).width).toBe("100%");
    expect(parseFloat(catalogFlagStyle(switzerland).width)).toBeCloseTo(
      (30 / maxFlagLengthCm) * (stage / 30) * 100,
    );
    expect(catalogFlagStyle(switzerland).aspectRatio).toBe("30 / 30");
    expect(catalogFlagStyle(unitedKingdom).width).toBe("100%");

    for (const item of flags) {
      const size = fittedFlagSize(item);
      const scale = Math.min(1, stage / size.heightCm);
      expect(size.heightCm * scale).toBeLessThanOrEqual(stage + 1e-9);
      expect(catalogFlagStyle(item).aspectRatio).toBe(
        `${size.lengthCm} / ${size.heightCm}`,
      );
    }
  });
});
