import { describe, expect, it } from "vitest";
import type { PrintLayout } from "../config/print";
import { printLayout } from "../config/print";
import type { Flag } from "../types/flag";
import { flagClothById } from "../data/sheet";
import { fittedFlagSize } from "./flagSize";
import { buildSheetGeometry, type MmRect, type SheetMark } from "./sheetGeometry";

const layout: PrintLayout = {
  hemMm: 10,
  gutterMm: 4,
  outerMarginMm: 8,
  labelCoverage: 0.8,
  cutStrokeMm: 2,
  cutDashMm: 2.5,
  cutGapMm: 2.5,
  foldStrokeMm: 1,
  foldDashMm: 1.5,
  foldGapMm: 1.5,
};

function flag(id: string, height: number, length: number, label = id): Flag {
  return {
    id,
    iso: id,
    labels: [label],
    hemLabel: label,
    ratio: { height, length },
    asset: { svg: `/flags/${id}.svg` },
    region: "Europe",
    kind: "national",
  };
}

describe("sheet geometry", () => {
  it("returns an empty sheet when nothing is selected", () => {
    expect(buildSheetGeometry([], 2, 2, layout)).toEqual({
      pageWidthMm: 0,
      pageHeightMm: 0,
      flags: [],
      marks: [],
    });
    expect(buildSheetGeometry([flag("dk", 28, 37)], 0, 2, layout).flags).toEqual(
      [],
    );
  });

  it("fills 30 cm by 45 cm and keeps the hem, cut, and label", () => {
    const source = flag("gb", 1, 2, "United Kingdom");
    const sheet = buildSheetGeometry(
      [source],
      2,
      2,
      layout,
      flagClothById("45x30"),
      "stretched",
    );
    const placed = sheet.flags[0];

    expect(placed.artwork.width).toBe(450);
    expect(placed.artwork.height).toBe(300);
    expect(placed.design).toEqual(placed.artwork);
    expect(placed.artwork.x - placed.cut.x).toBe(layout.hemMm);
    expect(placed.artwork.y - placed.cut.y).toBe(layout.hemMm);
    expect(cutOutline(sheet.marks, placed.cut)).toBe(true);
    expect(placed.label.x).toBeCloseTo(placed.cut.x + layout.hemMm / 2);
    expect(placed.label.y).toBeCloseTo(placed.artwork.y + placed.artwork.height / 2);
    expect(placed.label.angle).toBe(90);
  });

  it("centers the official ratio on a full cloth at max size", () => {
    const sheet = buildSheetGeometry(
      [flag("gb", 1, 2, "United Kingdom")],
      1,
      1,
      layout,
      flagClothById("30x20"),
      "max",
    );
    const placed = sheet.flags[0];

    expect(placed.artwork.width).toBe(300);
    expect(placed.artwork.height).toBe(200);
    expect(placed.design.width).toBe(300);
    expect(placed.design.height).toBe(150);
    expect(placed.design.x).toBeCloseTo(placed.artwork.x);
    expect(placed.design.y).toBeCloseTo(placed.artwork.y + 25);
  });

  it("places one flag at its finished size, with hem outside the artwork", () => {
    const source = flag("dk", 28, 37, "Denmark");
    const fitted = fittedFlagSize(source);
    const sheet = buildSheetGeometry([source], 2, 2, layout);
    const placed = sheet.flags[0];

    expect(placed.artwork.width).toBeCloseTo(fitted.lengthCm * 10);
    expect(placed.artwork.height).toBeCloseTo(fitted.heightCm * 10);
    expect(placed.cut.x).toBe(layout.outerMarginMm);
    expect(placed.cut.y).toBe(layout.outerMarginMm);
    expect(placed.artwork.x - placed.cut.x).toBe(layout.hemMm);
    expect(placed.artwork.y - placed.cut.y).toBe(layout.hemMm);
    expect(sheet.pageWidthMm).toBeCloseTo(
      layout.outerMarginMm * 2 + placed.cut.width,
    );
    expect(sheet.pageHeightMm).toBeCloseTo(
      layout.outerMarginMm * 2 + placed.cut.height,
    );
  });

  it("separates neighbours by the gutter and keeps the hoist edges in a column", () => {
    const sheet = buildSheetGeometry(
      [flag("gb", 1, 2, "United Kingdom"), flag("dk", 28, 37, "Denmark")],
      2,
      2,
      layout,
    );
    const [unitedKingdom, denmark] = sheet.flags;

    expect(denmark.cut.x - (unitedKingdom.cut.x + unitedKingdom.cut.width)).toBe(
      layout.gutterMm,
    );
    expect(unitedKingdom.cut.y + unitedKingdom.cut.height / 2).toBeCloseTo(
      denmark.cut.y + denmark.cut.height / 2,
    );
    expect(sheet.pageHeightMm).toBeCloseTo(
      layout.outerMarginMm * 2 + denmark.cut.height,
    );
  });

  it("uses only the rows the selection needs", () => {
    const flags = [
      flag("a", 1, 2),
      flag("b", 1, 2),
      flag("c", 1, 2),
      flag("d", 1, 2),
      flag("e", 1, 2),
    ];
    const sheet = buildSheetGeometry(flags, 2, 5, layout);
    expect(sheet.flags).toHaveLength(5);
    expect(sheet.flags[4].cut.x).toBe(sheet.flags[0].cut.x);
    expect(sheet.flags[4].cut.y).toBeGreaterThan(sheet.flags[2].cut.y);
  });

  it("stops at the number of slots", () => {
    const flags = [flag("a", 1, 2), flag("b", 1, 2), flag("c", 1, 2)];
    expect(buildSheetGeometry(flags, 1, 2, layout).flags.map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("draws the fold line on each flag edge and keeps it out of the gutter", () => {
    const sheet = buildSheetGeometry(
      [flag("gb", 1, 2, "United Kingdom"), flag("dk", 28, 37, "Denmark")],
      2,
      2,
      layout,
    );
    const [left, right] = sheet.flags;
    const folds = sheet.marks.filter((mark) => mark.kind === "fold");

    expect(folds).toHaveLength(8);
    for (const placed of sheet.flags) {
      const own = folds.filter((mark) => onArtworkEdge(mark, placed.artwork));
      expect(own).toHaveLength(4);
    }

    const gutterLeft = left.cut.x + left.cut.width;
    const gutterRight = right.cut.x;
    for (const mark of folds) {
      const minX = Math.min(mark.x1, mark.x2);
      const maxX = Math.max(mark.x1, mark.x2);
      expect(maxX <= gutterLeft || minX >= gutterRight).toBe(true);
    }
  });

  it("draws a cut outline around each flag and no line through the gutter", () => {
    const sheet = buildSheetGeometry(
      [flag("gb", 1, 2, "United Kingdom"), flag("dk", 28, 37, "Denmark")],
      2,
      2,
      layout,
    );
    const [left, right] = sheet.flags;
    const throughTheGutter = sheet.marks.some(
      (mark) =>
        mark.kind === "cut" &&
        mark.x1 === mark.x2 &&
        mark.x1 > left.cut.x + left.cut.width &&
        mark.x1 < right.cut.x,
    );

    expect(throughTheGutter).toBe(false);
    expect(cutOutline(sheet.marks, left.cut)).toBe(true);
    expect(cutOutline(sheet.marks, right.cut)).toBe(true);
  });

  it("draws a cut outline around a flag that has no neighbour", () => {
    const sheet = buildSheetGeometry([flag("dk", 28, 37, "Denmark")], 2, 2, layout);
    const placed = sheet.flags[0];
    expect(sheet.marks.filter((mark) => mark.kind === "fold")).toHaveLength(4);
    expect(cutOutline(sheet.marks, placed.cut)).toBe(true);
  });

  it("prints the country name in the hoist hem, outside the artwork", () => {
    const sheet = buildSheetGeometry([flag("dk", 28, 37, "Denmark")], 2, 2, layout);
    const placed = sheet.flags[0];
    expect(placed.label.text).toBe("Denmark");
    expect(placed.label.angle).toBe(90);
    expect(placed.label.x).toBeCloseTo(placed.cut.x + layout.hemMm / 2);
    expect(placed.label.x).toBeLessThan(placed.artwork.x);
    expect(placed.label.y).toBeCloseTo(placed.artwork.y + placed.artwork.height / 2);
  });

  it("opens the next row only after the row above is full", () => {
    const flags = ["a", "b", "c", "d", "e"].map((id) => flag(id, 2, 3));
    const columns = 4;
    const rows = Math.ceil(flags.length / columns);
    const sheet = buildSheetGeometry(flags, columns, rows, layout);
    const [first, , , fourth, fifth] = sheet.flags;

    expect(rows).toBe(2);
    expect(sheet.flags).toHaveLength(5);
    expect(fourth.cut.y).toBeCloseTo(first.cut.y);
    expect(fifth.cut.y).toBeGreaterThan(first.cut.y);
    expect(fifth.cut.x).toBeCloseTo(first.cut.x);
    expect(sheet.pageHeightMm).toBeCloseTo(
      layout.outerMarginMm * 2 +
        first.cut.height +
        fifth.cut.height +
        layout.gutterMm,
    );
  });

  it("reads left to right and does not reserve empty columns", () => {
    const sheet = buildSheetGeometry(
      [flag("a", 1, 2), flag("b", 1, 2), flag("c", 1, 2)],
      4,
      2,
      layout,
    );
    const [first, second, third] = sheet.flags;

    expect(second.cut.x).toBeGreaterThan(first.cut.x);
    expect(second.cut.y).toBeCloseTo(first.cut.y);
    expect(third.cut.x).toBeGreaterThan(second.cut.x);
    expect(sheet.pageWidthMm).toBeCloseTo(
      layout.outerMarginMm * 2 +
        first.cut.width +
        second.cut.width +
        third.cut.width +
        layout.gutterMm * 2,
    );
  });

  it("keeps a narrower flag on the hoist edge of its column", () => {
    const sheet = buildSheetGeometry(
      [
        flag("gb", 1, 2, "United Kingdom"),
        flag("fi", 11, 18, "Finland"),
        flag("dk", 28, 37, "Denmark"),
      ],
      2,
      2,
      layout,
    );
    const [unitedKingdom, finland, denmark] = sheet.flags;

    expect(denmark.cut.x).toBe(unitedKingdom.cut.x);
    expect(denmark.cut.width).toBeLessThan(unitedKingdom.cut.width);
    expect(finland.cut.x).toBeCloseTo(
      unitedKingdom.cut.x + unitedKingdom.cut.width + layout.gutterMm,
    );
    expect(finland.cut.x - (denmark.cut.x + denmark.cut.width)).toBeGreaterThan(
      layout.gutterMm,
    );
  });

  it("centers a shorter flag on the row without a cut line through the sheet", () => {
    const sheet = buildSheetGeometry(
      [
        flag("fi", 11, 18, "Finland"),
        flag("gb", 1, 2, "United Kingdom"),
        flag("pl", 5, 8, "Poland"),
        flag("lt", 3, 5, "Lithuania"),
      ],
      2,
      2,
      layout,
    );
    const [finland, unitedKingdom, poland, lithuania] = sheet.flags;

    expect(unitedKingdom.cut.y + unitedKingdom.cut.height / 2).toBeCloseTo(
      finland.cut.y + finland.cut.height / 2,
    );
    expect(unitedKingdom.cut.y).toBeGreaterThan(finland.cut.y);
    expect(lithuania.cut.y + lithuania.cut.height / 2).toBeCloseTo(
      poland.cut.y + poland.cut.height / 2,
    );

    expect(unitedKingdom.artwork.y - unitedKingdom.cut.y).toBe(layout.hemMm);
    expect(
      unitedKingdom.cut.y +
        unitedKingdom.cut.height -
        (unitedKingdom.artwork.y + unitedKingdom.artwork.height),
    ).toBe(layout.hemMm);

    for (const placed of sheet.flags) {
      expect(cutOutline(sheet.marks, placed.cut)).toBe(true);
    }

    const throughTheSheet = sheet.marks.some((mark) => {
      if (mark.kind !== "cut") return false;
      const crossesColumns =
        mark.y1 === mark.y2 && Math.abs(mark.x2 - mark.x1) > finland.cut.width;
      const crossesRows =
        mark.x1 === mark.x2 &&
        mark.x1 > finland.cut.x + finland.cut.width &&
        mark.x1 < unitedKingdom.cut.x;
      return crossesColumns || crossesRows;
    });
    expect(throughTheSheet).toBe(false);
  });

  it("uses the print margins, hem, and dash sizes", () => {
    expect(printLayout.outerMarginMm).toBe(8);
    expect(printLayout.gutterMm).toBe(8);
    expect(printLayout.hemMm).toBe(20);
    expect(printLayout.cutStrokeMm).toBe(2);
    expect(printLayout.cutDashMm).toBe(2.5);
    expect(printLayout.cutGapMm).toBe(2.5);
    expect(printLayout.foldStrokeMm).toBe(1);
    expect(printLayout.foldDashMm).toBe(1.5);
    expect(printLayout.foldGapMm).toBe(1.5);
    expect(printLayout.labelCoverage).toBe(0.8);
  });
});

function cutOutline(marks: readonly SheetMark[], cut: MmRect): boolean {
  const right = cut.x + cut.width;
  const bottom = cut.y + cut.height;
  const edges = [
    [cut.x, cut.y, right, cut.y],
    [cut.x, bottom, right, bottom],
    [cut.x, cut.y, cut.x, bottom],
    [right, cut.y, right, bottom],
  ];
  return edges.every(([x1, y1, x2, y2]) =>
    marks.some(
      (mark) =>
        mark.kind === "cut" &&
        mark.x1 === x1 &&
        mark.y1 === y1 &&
        mark.x2 === x2 &&
        mark.y2 === y2,
    ),
  );
}

function onArtworkEdge(mark: SheetMark, artwork: MmRect): boolean {
  const minX = Math.min(mark.x1, mark.x2);
  const maxX = Math.max(mark.x1, mark.x2);
  const minY = Math.min(mark.y1, mark.y2);
  const maxY = Math.max(mark.y1, mark.y2);
  const right = artwork.x + artwork.width;
  const bottom = artwork.y + artwork.height;
  const horizontal =
    minY === maxY &&
    (minY === artwork.y || minY === bottom) &&
    minX === artwork.x &&
    maxX === right;
  const vertical =
    minX === maxX &&
    (minX === artwork.x || minX === right) &&
    minY === artwork.y &&
    maxY === bottom;
  return horizontal || vertical;
}
