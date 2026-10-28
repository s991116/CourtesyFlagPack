import { flagById, flags } from "../data/flags";
import {
  defaultFlagClothId,
  defaultFlagsPerRow,
  flagsPerRowOptions,
  type FlagClothId,
} from "../data/sheet";
import { defaultFlagFit, type FlagFit } from "./flagSize";

export type FlagSelectionFile = {
  clothId: FlagClothId;
  /** Sheet shape. "original" in the file is the menu value, stored here as "max". */
  fit: FlagFit;
  columns: number;
  flagIds: string[];
  unknown: string[];
};

const fileName = "courtesy-flags.txt";

export function selectionFileName(): string {
  return fileName;
}

/** Text file of the current sheet. Each flag is only its id. */
export function formatFlagSelection(selection: {
  clothId: FlagClothId;
  fit: FlagFit;
  columns: number;
  flagIds: readonly string[];
}): string {
  const ratio = selection.fit === "stretched" ? "stretched" : "original";
  const lines = [
    "# Courtesy flags",
    `size: ${selection.clothId}`,
    `ratio: ${ratio}`,
    `flags per row: ${selection.columns}`,
    ...selection.flagIds,
  ];
  return `${lines.join("\n")}\n`;
}

/** Read a selection file. Unknown flag lines are listed and left out. */
export function parseFlagSelection(text: string): FlagSelectionFile {
  let clothId = defaultFlagClothId;
  let fit: FlagFit = defaultFlagFit;
  let columns = defaultFlagsPerRow;
  let sawContent = false;
  const flagIds: string[] = [];
  const unknown: string[] = [];

  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    sawContent = true;
    const colon = line.indexOf(":");
    if (colon > 0) {
      const key = line.slice(0, colon).trim().toLowerCase().replace(/\s+/g, " ");
      const value = line.slice(colon + 1).trim();
      if (isSizeKey(key)) {
        clothId = parseSize(value);
        continue;
      }
      if (isRatioKey(key)) {
        fit = parseRatio(value);
        continue;
      }
      if (isColumnsKey(key)) {
        columns = parseColumns(value);
        continue;
      }
    }
    const id = flagIdFromToken(line);
    if (!id) {
      unknown.push(line);
      continue;
    }
    if (!flagIds.includes(id)) flagIds.push(id);
  }

  if (!sawContent) throw new Error("The file could not be read.");
  return { clothId, fit, columns, flagIds, unknown };
}

function isSizeKey(key: string): boolean {
  return key === "size" || key === "dimension" || key === "dimensions";
}

function isRatioKey(key: string): boolean {
  return key === "ratio" || key === "shape";
}

function isColumnsKey(key: string): boolean {
  return key === "flags per row" || key === "per row" || key === "columns";
}

function parseSize(value: string): FlagClothId {
  const compact = value
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, "")
    .replace(/cm$/, "");
  if (compact === "45x30" || compact === "30x20") return compact;
  throw new Error("The file could not be read.");
}

function parseRatio(value: string): FlagFit {
  const ratio = value.trim().toLowerCase();
  if (ratio === "stretched") return "stretched";
  if (ratio === "original" || ratio === "max") return "max";
  throw new Error("The file could not be read.");
}

function parseColumns(value: string): number {
  const columns = Number(value);
  if ((flagsPerRowOptions as readonly number[]).includes(columns)) return columns;
  throw new Error("The file could not be read.");
}

function flagIdFromToken(token: string): string | undefined {
  const direct = flagById(token) ?? flagById(token.toLowerCase());
  if (direct) return direct.id;
  const name = token.toLowerCase();
  return flags.find((flag) => flag.hemLabel.toLowerCase() === name)?.id;
}
