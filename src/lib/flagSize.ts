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

/** The picture drawn on the cloth. Signal flags keep their own ratio. */
export function designSize(
  flag: Flag,
  cloth: FlagCloth,
  fit: FlagFit,
): FittedFlag {
  if (appliedFit(flag, fit) === "stretched") {
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
  if (appliedFit(flag, fit) === "original") return fittedFlagSize(flag, cloth);
  return { heightCm: cloth.heightCm, lengthCm: cloth.lengthCm };
}

/** Signal flags keep their ratio. A square stays square unless it is stretched. */
function appliedFit(flag: Flag, fit: FlagFit): FlagFit {
  if (flag.detail === "Signal Flag") return "original";
  if (fit !== "stretched" && flag.ratio.height === flag.ratio.length) return "original";
  return fit;
}

/**
 * Preview columns follow the cut piece. A square flag is only as wide as
 * that square, and empty places in the row are left outside the frame.
 */
export function previewGridStyle(
  flags: readonly Flag[],
  columns: number,
  cloth: FlagCloth,
  fit: FlagFit,
): { gridTemplateColumns: string; width: string } {
  const used = Math.min(Math.max(columns, 1), flags.length);
  const lengths = Array.from({ length: used }, () => 0);
  for (let index = 0; index < flags.length; index += 1) {
    const column = index % Math.max(columns, 1);
    if (column >= used) continue;
    lengths[column] = Math.max(
      lengths[column],
      pieceSize(flags[index], cloth, fit).lengthCm,
    );
  }
  const fullRowCm = Math.max(columns, 1) * cloth.lengthCm;
  const usedCm = lengths.reduce((sum, length) => sum + length, 0);
  return {
    gridTemplateColumns: lengths.map((length) => `${length}fr`).join(" "),
    width: `${Math.min(100, (usedCm / fullRowCm) * 100)}%`,
  };
}

/** The preview slot. Original ratio is only as large as the flag. */
export function slotFlagStyle(
  flag: Flag,
  cloth: FlagCloth,
  fit: FlagFit,
): { aspectRatio: string } {
  const size =
    appliedFit(flag, fit) === "original"
      ? designSize(flag, cloth, fit)
      : pieceSize(flag, cloth, fit);
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
