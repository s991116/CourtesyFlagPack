import { describe, expect, it } from "vitest";
import {
  bleedIntoArtwork,
  hemFlipTransform,
  intersectRects,
  mirrorDesign,
  viewBoxSlice,
} from "./hemMirror";

const artwork = { x: 10, y: 20, width: 100, height: 80 };

describe("mirrored hem", () => {
  it("places the reflected flag against the fold", () => {
    expect(mirrorDesign(artwork, artwork, "left")).toEqual({
      x: -90,
      y: 20,
      width: 100,
      height: 80,
    });
    expect(mirrorDesign(artwork, artwork, "right").x).toBe(110);
    expect(mirrorDesign(artwork, artwork, "top").y).toBe(-60);
    expect(mirrorDesign(artwork, artwork, "bottom").y).toBe(100);
    const corner = mirrorDesign(artwork, artwork, "top-left");
    expect(corner.x).toBe(-90);
    expect(corner.y).toBe(-60);
  });

  it("flips the picture so the fold edge stays on the fold", () => {
    const view = { x: 0, y: 0, width: 640, height: 480 };
    expect(hemFlipTransform(view, "left")).toBe("translate(640 0) scale(-1 1)");
    expect(hemFlipTransform(view, "top")).toBe("translate(0 480) scale(1 -1)");
    expect(hemFlipTransform(view, "bottom-right")).toBe("translate(640 480) scale(-1 -1)");
  });

  it("maps the hem slice into the viewBox and bleeds it onto the fold", () => {
    const placed = mirrorDesign(artwork, artwork, "left");
    const hem = { x: 0, y: 20, width: 10, height: 80 };
    const overlap = intersectRects(hem, placed);
    expect(overlap).toEqual(hem);
    const bled = bleedIntoArtwork(overlap!, artwork);
    expect(bled.width).toBeCloseTo(10.2);
    const slice = viewBoxSlice({ x: 0, y: 0, width: 100, height: 80 }, placed, bled);
    expect(slice.x).toBeCloseTo(90);
    expect(slice.width).toBeCloseTo(10.2);
  });
});
