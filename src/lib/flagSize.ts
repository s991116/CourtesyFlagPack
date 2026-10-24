import {
  flagClothById,
  maxFlagHeightCm,
  maxFlagLengthCm,
  type FlagCloth,
} from "../data/sheet";
import { flagById } from "../data/flags";
import type { Flag } from "../types/flag";

export type FittedFlag = {
  lengthCm: number;
  heightCm: number;
};

/**
 * Original keeps the ratio and centers it on the chosen cloth.
 * Stretched fills that cloth.
 * Original ratio keeps the ratio and trims the cloth to the flag.
 */
export type FlagFit = "max" | "stretched" | "original";

export const defaultFlagFit: FlagFit = "stretched";

const largestCloth = flagClothById("45x30");

/** Scale a flag so it keeps its ratio and stays inside the cloth. */
export function fittedFlagSize(
  flag: Flag,
  cloth: FlagCloth = largestCloth,
): FittedFlag {
  const scale = Math.min(
    cloth.heightCm / flag.ratio.height,
    cloth.lengthCm / flag.ratio.length,
  );
  return {
    heightCm: flag.ratio.height * scale,
    lengthCm: flag.ratio.length * scale,
  };
}

/** The picture drawn on the cloth. */
export function designSize(
  flag: Flag,
  cloth: FlagCloth,
  fit: FlagFit,
): FittedFlag {
  if (fit === "stretched") {
    return { heightCm: cloth.heightCm, lengthCm: cloth.lengthCm };
  }
  return fittedFlagSize(flag, cloth);
}

/** The finished cloth. Original ratio is cut to the flag. */
export function pieceSize(
  flag: Flag,
  cloth: FlagCloth,
  fit: FlagFit,
): FittedFlag {
  if (fit === "original") return fittedFlagSize(flag, cloth);
  return { heightCm: cloth.heightCm, lengthCm: cloth.lengthCm };
}

/** The preview slot. Original ratio is only as large as the flag. */
export function slotFlagStyle(
  flag: Flag,
  cloth: FlagCloth,
  fit: FlagFit,
): { aspectRatio: string } {
  const size = fit === "original" ? designSize(flag, cloth, fit) : pieceSize(flag, cloth, fit);
  return { aspectRatio: `${size.lengthCm} / ${size.heightCm}` };
}

/** The flag picture inside its slot. */
export function flagImageStyle(
  flag: Flag,
  cloth: FlagCloth,
  fit: FlagFit,
): { width: string; aspectRatio: string } {
  const design = designSize(flag, cloth, fit);
  const piece = pieceSize(flag, cloth, fit);
  return {
    width: `${(design.lengthCm / piece.lengthCm) * 100}%`,
    aspectRatio: `${design.lengthCm} / ${design.heightCm}`,
  };
}

/** Albania's fitted height inside the largest cloth. */
export function catalogStageHeightCm(): number {
  const albania = flagById("al");
  return albania ? fittedFlagSize(albania).heightCm : maxFlagHeightCm;
}

/** The shared catalog stage, wide as the card and as tall as Albania. */
export function catalogStageStyle(): { aspectRatio: string } {
  return {
    aspectRatio: `${maxFlagLengthCm} / ${catalogStageHeightCm()}`,
  };
}

/** Catalog cloth. Flags taller than Albania shrink, and keep their ratio. */
export function catalogFlagStyle(flag: Flag): { width: string; aspectRatio: string } {
  const size = fittedFlagSize(flag);
  const scale = Math.min(1, catalogStageHeightCm() / size.heightCm);
  return {
    width: `${(size.lengthCm / maxFlagLengthCm) * scale * 100}%`,
    aspectRatio: `${size.lengthCm} / ${size.heightCm}`,
  };
}
