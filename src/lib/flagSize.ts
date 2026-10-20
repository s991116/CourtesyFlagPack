import { maxFlagHeightCm, maxFlagLengthCm } from "../data/sheet";
import type { Flag } from "../types/flag";

export type FittedFlag = {
  lengthCm: number;
  heightCm: number;
};

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

/** Same height for every sheet slot, so the remove control does not follow the flag. */
export function slotFlagStyle(): { aspectRatio: string } {
  return { aspectRatio: `${maxFlagLengthCm} / ${maxFlagHeightCm}` };
}

/** The flag itself, sized against a 40 cm fly without an outer frame. */
export function flagImageStyle(flag: Flag): { width: string; aspectRatio: string } {
  const size = fittedFlagSize(flag);
  return {
    width: `${(size.lengthCm / maxFlagLengthCm) * 100}%`,
    aspectRatio: `${size.lengthCm} / ${size.heightCm}`,
  };
}
