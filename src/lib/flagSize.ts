import { maxFlagHeightCm, maxFlagLengthCm } from "../data/sheet";
import type { Flag } from "../types/flag";

export type FittedFlag = {
  lengthCm: number;
  heightCm: number;
};

/** Original ratio, or the full 30 cm by 40 cm cloth. */
export type FlagProportion = "original" | "fixed";

/** Scale a flag so it keeps its ratio and stays inside 40 cm by 30 cm. */
export function fittedFlagSize(flag: Flag): FittedFlag {
  const scale = Math.min(
    maxFlagHeightCm / flag.ratio.height,
    maxFlagLengthCm / flag.ratio.length,
  );
  return {
    heightCm: flag.ratio.height * scale,
    lengthCm: flag.ratio.length * scale,
  };
}

/** Finished cloth size. Fixed flags fill 30 cm by 40 cm. */
export function artworkSize(
  flag: Flag,
  proportion: FlagProportion = "original",
): FittedFlag {
  if (proportion === "fixed") {
    return { heightCm: maxFlagHeightCm, lengthCm: maxFlagLengthCm };
  }
  return fittedFlagSize(flag);
}

/** Same height for every sheet slot, so the remove control does not follow the flag. */
export function slotFlagStyle(): { aspectRatio: string } {
  return { aspectRatio: `${maxFlagLengthCm} / ${maxFlagHeightCm}` };
}

/** The flag itself, sized against a 40 cm fly without an outer frame. */
export function flagImageStyle(
  flag: Flag,
  proportion: FlagProportion = "original",
): { width: string; aspectRatio: string } {
  const size = artworkSize(flag, proportion);
  return {
    width: `${(size.lengthCm / maxFlagLengthCm) * 100}%`,
    aspectRatio: `${size.lengthCm} / ${size.heightCm}`,
  };
}
