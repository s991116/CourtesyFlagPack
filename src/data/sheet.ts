/** Largest cloth: 45 cm on the fly, 30 cm on the hoist. */
export const flagCloths = [
  { id: "45x30", lengthCm: 45, heightCm: 30, label: "45 × 30 cm" },
  { id: "30x20", lengthCm: 30, heightCm: 20, label: "30 × 20 cm" },
] as const;

export type FlagClothId = (typeof flagCloths)[number]["id"];

export type FlagCloth = {
  id: FlagClothId;
  lengthCm: number;
  heightCm: number;
  label: string;
};

export const defaultFlagClothId: FlagClothId = "45x30";

export const maxFlagLengthCm = flagCloths[0].lengthCm;
export const maxFlagHeightCm = flagCloths[0].heightCm;

export function flagClothById(id: FlagClothId): FlagCloth {
  return flagCloths.find((cloth) => cloth.id === id) ?? flagCloths[0];
}

/** How many flags sit in one row of the sheet. */
export const flagsPerRowOptions = [2, 3, 4, 5, 6] as const;

export const defaultFlagsPerRow = 4;
