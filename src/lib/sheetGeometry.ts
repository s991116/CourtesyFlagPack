import { printLayout, type PrintLayout } from "../config/print";
import type { Flag } from "../types/flag";
import { artworkSize, type FlagProportion } from "./flagSize";
import { sheetCapacity } from "./layout";

export type MmRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SheetMark = {
  kind: "cut" | "fold";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type HemLabel = {
  text: string;
  x: number;
  y: number;
  /** Degrees counterclockwise, so the name runs along the hoist. */
  angle: number;
};

export type PlacedFlag = {
  id: string;
  artwork: MmRect;
  cut: MmRect;
  label: HemLabel;
};

export type SheetGeometry = {
  pageWidthMm: number;
  pageHeightMm: number;
  flags: PlacedFlag[];
  marks: SheetMark[];
};

const emptySheet: SheetGeometry = {
  pageWidthMm: 0,
  pageHeightMm: 0,
  flags: [],
  marks: [],
};

/**
 * Place the selected flags on one sheet.
 * Origin is the top-left corner. X grows right, Y grows down.
 * Each flag is its finished size, with hem outside that.
 * A dashed cut line follows the edge of each cut piece.
 * A dashed fold line follows each flag edge and stops at the flag.
 */
export function buildSheetGeometry(
  flags: readonly Flag[],
  columns: number,
  rows: number,
  layout: PrintLayout = printLayout,
  proportion: FlagProportion = "original",
): SheetGeometry {
  const count = Math.min(flags.length, sheetCapacity(columns, rows));
  if (count === 0 || columns <= 0 || rows <= 0) return emptySheet;

  const usedColumns = Math.min(columns, count);
  const usedRows = Math.ceil(count / columns);
  const pieces = flags.slice(0, count).map((flag, index) => {
    const fitted = artworkSize(flag, proportion);
    const artworkWidth = fitted.lengthCm * 10;
    const artworkHeight = fitted.heightCm * 10;
    return {
      flag,
      column: index % columns,
      row: Math.floor(index / columns),
      artworkWidth,
      artworkHeight,
      cutWidth: artworkWidth + layout.hemMm * 2,
      cutHeight: artworkHeight + layout.hemMm * 2,
    };
  });

  const columnWidths = Array.from({ length: usedColumns }, () => 0);
  const rowHeights = Array.from({ length: usedRows }, () => 0);
  for (const piece of pieces) {
    columnWidths[piece.column] = Math.max(
      columnWidths[piece.column],
      piece.cutWidth,
    );
    rowHeights[piece.row] = Math.max(rowHeights[piece.row], piece.cutHeight);
  }

  const pageWidthMm =
    layout.outerMarginMm * 2 +
    columnWidths.reduce((sum, width) => sum + width, 0) +
    layout.gutterMm * Math.max(0, usedColumns - 1);
  const pageHeightMm =
    layout.outerMarginMm * 2 +
    rowHeights.reduce((sum, height) => sum + height, 0) +
    layout.gutterMm * Math.max(0, usedRows - 1);

  const columnX = (column: number) => {
    let x = layout.outerMarginMm;
    for (let index = 0; index < column; index += 1) {
      x += columnWidths[index] + layout.gutterMm;
    }
    return x;
  };
  const rowY = (row: number) => {
    let y = layout.outerMarginMm;
    for (let index = 0; index < row; index += 1) {
      y += rowHeights[index] + layout.gutterMm;
    }
    return y;
  };

  const placed: PlacedFlag[] = [];
  const marks: SheetMark[] = [];
  for (const piece of pieces) {
    const slotTop = rowY(piece.row);
    const slotHeight = rowHeights[piece.row];
    const cut: MmRect = {
      x: columnX(piece.column),
      y: slotTop + (slotHeight - piece.cutHeight) / 2,
      width: piece.cutWidth,
      height: piece.cutHeight,
    };
    const artwork: MmRect = {
      x: cut.x + layout.hemMm,
      y: cut.y + layout.hemMm,
      width: piece.artworkWidth,
      height: piece.artworkHeight,
    };
    placed.push({
      id: piece.flag.id,
      artwork,
      cut,
      label: {
        text: piece.flag.hemLabel,
        x: cut.x + layout.hemMm / 2,
        y: artwork.y + artwork.height / 2,
        angle: 90,
      },
    });
    addFoldLines(marks, artwork);
    addCutOutline(marks, cut);
  }

  return { pageWidthMm, pageHeightMm, flags: placed, marks };
}

function addCutOutline(marks: SheetMark[], cut: MmRect) {
  const right = cut.x + cut.width;
  const bottom = cut.y + cut.height;
  marks.push(
    { kind: "cut", x1: cut.x, y1: cut.y, x2: right, y2: cut.y },
    { kind: "cut", x1: cut.x, y1: bottom, x2: right, y2: bottom },
    { kind: "cut", x1: cut.x, y1: cut.y, x2: cut.x, y2: bottom },
    { kind: "cut", x1: right, y1: cut.y, x2: right, y2: bottom },
  );
}

function addFoldLines(marks: SheetMark[], artwork: MmRect) {
  const right = artwork.x + artwork.width;
  const bottom = artwork.y + artwork.height;
  marks.push(
    { kind: "fold", x1: artwork.x, y1: artwork.y, x2: right, y2: artwork.y },
    { kind: "fold", x1: artwork.x, y1: bottom, x2: right, y2: bottom },
    { kind: "fold", x1: artwork.x, y1: artwork.y, x2: artwork.x, y2: bottom },
    { kind: "fold", x1: right, y1: artwork.y, x2: right, y2: bottom },
  );
}

