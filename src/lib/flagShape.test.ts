import { describe, expect, it } from "vitest";
import {
  edgeDistance,
  finishedOutline,
  hemSourcePoint,
  offsetOutward,
  pointInPolygon,
  swallowtailNotch,
} from "./flagShape";

describe("flag shape", () => {
  it("offsets a rectangle by the same amount on every side", () => {
    const outline = finishedOutline(100, 40);
    const cut = offsetOutward(outline, 10);
    const expected = [
      { x: -10, y: -10 },
      { x: 110, y: -10 },
      { x: 110, y: 50 },
      { x: -10, y: 50 },
    ];
    cut.forEach((point, index) => {
      expect(point.x).toBeCloseTo(expected[index].x);
      expect(point.y).toBeCloseTo(expected[index].y);
    });
  });

  it("keeps the swallowtail inside the max width and length, with an even hem", () => {
    const width = 450;
    const height = 300;
    const hem = 20;
    const outline = finishedOutline(width, height, "swallowtail");
    const cut = offsetOutward(outline, hem);
    expect(outline[1]).toEqual({ x: width, y: 0 });
    expect(outline[2]).toEqual({ x: width * (1 - swallowtailNotch), y: height / 2 });
    expect(outline[3]).toEqual({ x: width, y: height });
    expect(pointInPolygon({ x: width / 2, y: height / 2 }, outline)).toBe(true);
    expect(pointInPolygon({ x: width - 5, y: height / 2 }, outline)).toBe(false);
    for (let index = 0; index < outline.length; index += 1) {
      const start = outline[index];
      const end = outline[(index + 1) % outline.length];
      expect(edgeDistance(cut[index], start, end)).toBeCloseTo(hem);
      expect(edgeDistance(cut[(index + 1) % cut.length], start, end)).toBeCloseTo(hem);
    }
  });

  it("folds the hem straight back across an edge and through a corner", () => {
    const outline = finishedOutline(100, 40);
    expect(hemSourcePoint({ x: -5, y: 20 }, outline)).toEqual({ x: 5, y: 20 });
    const corner = hemSourcePoint({ x: -4, y: -3 }, outline);
    expect(corner.x).toBeCloseTo(4);
    expect(corner.y).toBeCloseTo(3);
    expect(pointInPolygon(corner, outline)).toBe(true);
  });

  it("folds the swallowtail notch back onto the flag", () => {
    const outline = finishedOutline(450, 300, "swallowtail");
    const notch = { x: 440, y: 150 };
    expect(pointInPolygon(notch, outline)).toBe(false);
    const source = hemSourcePoint(notch, outline);
    expect(pointInPolygon(source, outline)).toBe(true);
    expect(source.x).toBeLessThan(notch.x);
  });
});
