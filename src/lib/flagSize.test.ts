import { describe, expect, it } from "vitest";
import { flags } from "../data/flags";
import { flagClothById, maxFlagHeightCm, maxFlagLengthCm } from "../data/sheet";
import type { Flag } from "../types/flag";
import { catalogFlagStyle, designSize, fittedFlagSize, pieceSize } from "./flagSize";

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
  const large = flagClothById("45x30");
  const small = flagClothById("30x20");

  it("keeps the official ratio inside 45 cm by 30 cm", () => {
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
    expect(fittedFlagSize(flag(1, 2))).toEqual({ lengthCm: 45, heightCm: 22.5 });
    expect(fittedFlagSize(flag(5, 8))).toEqual({ lengthCm: 45, heightCm: 28.125 });
  });

  it("uses the full height when the flag is taller than the box", () => {
    const denmark = fittedFlagSize(flag(28, 37));
    expect(denmark.heightCm).toBeCloseTo(30);
    expect(denmark.lengthCm).toBeCloseTo(39.642857);
  });

  it("fits either cloth as max size, stretched, or original ratio", () => {
    expect(pieceSize(flag(1, 2), large, "max")).toEqual({
      heightCm: 30,
      lengthCm: 45,
    });
    expect(designSize(flag(1, 2), large, "max")).toEqual({
      heightCm: 22.5,
      lengthCm: 45,
    });
    expect(designSize(flag(1, 2), large, "stretched")).toEqual({
      heightCm: 30,
      lengthCm: 45,
    });
    expect(pieceSize(flag(1, 2), large, "original")).toEqual({
      heightCm: 22.5,
      lengthCm: 45,
    });
    expect(pieceSize(flag(1, 2), small, "stretched")).toEqual({
      heightCm: 20,
      lengthCm: 30,
    });
    expect(designSize(flag(28, 37), small, "original")).toEqual(
      fittedFlagSize(flag(28, 37), small),
    );
    expect(fittedFlagSize(flag(28, 37), small).lengthCm).toBeLessThanOrEqual(30);
    expect(fittedFlagSize(flag(28, 37), small).heightCm).toBeLessThanOrEqual(20);
  });

  it("shrinks catalog flags that are taller than Albania", () => {
    const albania = flags.find((item) => item.id === "al");
    const switzerland = flags.find((item) => item.id === "ch");
    const unitedKingdom = flags.find((item) => item.id === "gb");
    if (!albania || !switzerland || !unitedKingdom) {
      throw new Error("missing catalog flag");
    }
    const stage = fittedFlagSize(albania).heightCm;
    const albaniaSize = fittedFlagSize(albania);

    expect(parseFloat(catalogFlagStyle(albania).width)).toBeCloseTo(
      (albaniaSize.lengthCm / maxFlagLengthCm) * 100,
    );
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
