import { describe, expect, it } from "vitest";
import { printLayout } from "../config/print";
import type { Flag } from "../types/flag";
import {
  colorFrame,
  hemPieceRects,
  labelInk,
  mirrorDistance,
  mirrorIndex,
  mirroredArtworkPoint,
  type Rgb,
} from "./hemColor";
import { buildSheetGeometry } from "./sheetGeometry";

const blue: Rgb = { r: 0, g: 0, b: 145 };
const white: Rgb = { r: 255, g: 255, b: 255 };

function flag(id: string, height: number, length: number): Flag {
  return {
    id,
    iso: id,
    labels: [id],
    hemLabel: id,
    ratio: { height, length },
    asset: { svg: `/flags/${id}.svg` },
    region: "Europe",
    kind: "national",
  };
}

describe("hem mirror", () => {
  const artwork = { x: 28, y: 28, width: 300, height: 200 };

  it("mirrors a side across the vertical fold and keeps its height", () => {
    expect(mirroredArtworkPoint(18, 100, artwork)).toEqual({ x: 38, y: 100 });
    expect(mirroredArtworkPoint(338, 100, artwork)).toEqual({ x: 318, y: 100 });
  });

  it("mirrors the top and bottom across the horizontal fold", () => {
    expect(mirroredArtworkPoint(100, 16, artwork)).toEqual({ x: 100, y: 40 });
    expect(mirroredArtworkPoint(100, 240, artwork)).toEqual({ x: 100, y: 216 });
  });

  it("leaves a point inside the artwork unmirrored", () => {
    expect(mirroredArtworkPoint(100, 100, artwork)).toBeNull();
  });

  it("mirrors a corner across both fold lines, matching the side hem", () => {
    const corner = mirroredArtworkPoint(16, 16, artwork);
    const sideUnderTheVerticalFold = mirroredArtworkPoint(16, 40, artwork);
    const topOutsideTheVerticalFold = mirroredArtworkPoint(40, 16, artwork);

    expect(corner).toEqual({ x: 40, y: 40 });
    expect(sideUnderTheVerticalFold).toEqual(corner);
    expect(topOutsideTheVerticalFold).toEqual(corner);
  });

  it("reflects back after the motif has been mirrored once", () => {
    expect(mirrorDistance(10, 100)).toBe(10);
    expect(mirrorDistance(100, 100)).toBe(100);
    expect(mirrorDistance(110, 100)).toBe(90);
    expect(mirrorIndex(0, 10)).toBe(0);
    expect(mirrorIndex(9, 10)).toBe(9);
    expect(mirrorIndex(10, 10)).toBe(9);
    expect(mirrorIndex(11, 10)).toBe(8);
  });

  it("places fold cloth on the four sides and in the four corners", () => {
    const frame = { left: 8, right: 348, top: 8, bottom: 248 };
    const pieces = hemPieceRects(artwork, frame);
    const bySide = Object.fromEntries(pieces.map((piece) => [piece.side, piece]));

    expect(pieces.map((piece) => piece.side)).toEqual([
      "left",
      "right",
      "top",
      "bottom",
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);
    expect(bySide.left).toMatchObject({ x: 8, y: 28, width: 20, height: 200 });
    expect(bySide.right).toMatchObject({ x: 328, y: 28, width: 20, height: 200 });
    expect(bySide.top).toMatchObject({ x: 28, y: 8, width: 300, height: 20 });
    expect(bySide.bottom).toMatchObject({ x: 28, y: 228, width: 300, height: 20 });
    expect(bySide["top-left"]).toMatchObject({ x: 8, y: 8, width: 20, height: 20 });
    expect(bySide["bottom-right"]).toMatchObject({
      x: 328,
      y: 228,
      width: 20,
      height: 20,
    });
  });

  it("omits a side that has no fold cloth", () => {
    const frame = { left: 28, right: 348, top: 8, bottom: 248 };
    expect(hemPieceRects(artwork, frame).map((piece) => piece.side)).toEqual([
      "right",
      "top",
      "bottom",
      "top-right",
      "bottom-right",
    ]);
  });

  it("keeps the mirrored hem the same depth on every side", () => {
    const sheet = buildSheetGeometry(
      [
        flag("fi", 11, 18),
        flag("gb", 1, 2),
        flag("pl", 5, 8),
        flag("lt", 3, 5),
      ],
      2,
      2,
    );
    const unitedKingdom = sheet.flags[1];
    const frame = colorFrame(unitedKingdom);

    expect(frame.top).toBe(unitedKingdom.cut.y);
    expect(frame.bottom).toBe(unitedKingdom.cut.y + unitedKingdom.cut.height);
    expect(unitedKingdom.artwork.y - frame.top).toBe(printLayout.hemMm);
    expect(frame.bottom - (unitedKingdom.artwork.y + unitedKingdom.artwork.height)).toBe(
      printLayout.hemMm,
    );
  });

  it("picks white ink on the French blue and black ink on white", () => {
    expect(labelInk(blue)).toEqual({ r: 255, g: 255, b: 255 });
    expect(labelInk(white)).toEqual({ r: 0, g: 0, b: 0 });
  });
});
