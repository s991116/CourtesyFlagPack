import type { MmRect, PlacedFlag } from "./sheetGeometry";

export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export type ColorFrame = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type HemSide =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type HemPieceRect = {
  side: HemSide;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * The mirrored hem is the fold cloth around the flag.
 * It is the same depth on every side, and does not stretch out to the cut line.
 */
export function colorFrame(placed: PlacedFlag): ColorFrame {
  const { cut } = placed;
  return {
    left: cut.x,
    right: cut.x + cut.width,
    top: cut.y,
    bottom: cut.y + cut.height,
  };
}

/**
 * Rectangles of fold cloth around the artwork, out to the cut.
 * Side strips stop at the vertical folds. Corners are mirrored on both axes.
 */
export function hemPieceRects(artwork: MmRect, frame: ColorFrame): HemPieceRect[] {
  const artRight = artwork.x + artwork.width;
  const artBottom = artwork.y + artwork.height;
  const left = artwork.x - frame.left;
  const right = frame.right - artRight;
  const top = artwork.y - frame.top;
  const bottom = frame.bottom - artBottom;
  const pieces: HemPieceRect[] = [];

  if (left > 0) {
    pieces.push({
      side: "left",
      x: frame.left,
      y: artwork.y,
      width: left,
      height: artwork.height,
    });
  }
  if (right > 0) {
    pieces.push({
      side: "right",
      x: artRight,
      y: artwork.y,
      width: right,
      height: artwork.height,
    });
  }
  if (top > 0) {
    pieces.push({
      side: "top",
      x: artwork.x,
      y: frame.top,
      width: artwork.width,
      height: top,
    });
  }
  if (bottom > 0) {
    pieces.push({
      side: "bottom",
      x: artwork.x,
      y: artBottom,
      width: artwork.width,
      height: bottom,
    });
  }
  if (left > 0 && top > 0) {
    pieces.push({
      side: "top-left",
      x: frame.left,
      y: frame.top,
      width: left,
      height: top,
    });
  }
  if (right > 0 && top > 0) {
    pieces.push({
      side: "top-right",
      x: artRight,
      y: frame.top,
      width: right,
      height: top,
    });
  }
  if (left > 0 && bottom > 0) {
    pieces.push({
      side: "bottom-left",
      x: frame.left,
      y: artBottom,
      width: left,
      height: bottom,
    });
  }
  if (right > 0 && bottom > 0) {
    pieces.push({
      side: "bottom-right",
      x: artRight,
      y: artBottom,
      width: right,
      height: bottom,
    });
  }

  return pieces;
}

/**
 * Distance outward from a fold line, mapped back into the artwork.
 * Zero sits on the fold. Past the far side the motif reflects back.
 */
export function mirrorDistance(distance: number, span: number): number {
  if (span <= 0) return 0;
  const period = span * 2;
  let position = distance % period;
  if (position < 0) position += period;
  if (position > span) position = period - position;
  return position;
}

/** Pixel just outside a fold, mapped to the mirrored pixel inside a span. */
export function mirrorIndex(indexOut: number, span: number): number {
  if (span <= 1) return 0;
  const period = span * 2;
  let index = indexOut % period;
  if (index < 0) index += period;
  if (index >= span) index = period - 1 - index;
  return index;
}

/**
 * Point in the hem, mirrored across the fold lines into the artwork.
 * A corner is mirrored across both the horizontal and the vertical line.
 */
export function mirroredArtworkPoint(
  x: number,
  y: number,
  artwork: MmRect,
): { x: number; y: number } | null {
  const right = artwork.x + artwork.width;
  const bottom = artwork.y + artwork.height;
  const outsideX = x < artwork.x || x >= right;
  const outsideY = y < artwork.y || y >= bottom;
  if (!outsideX && !outsideY) return null;

  let sourceX = x;
  if (x < artwork.x) sourceX = artwork.x + mirrorDistance(artwork.x - x, artwork.width);
  else if (x >= right) sourceX = right - mirrorDistance(x - right, artwork.width);

  let sourceY = y;
  if (y < artwork.y) sourceY = artwork.y + mirrorDistance(artwork.y - y, artwork.height);
  else if (y >= bottom) sourceY = bottom - mirrorDistance(y - bottom, artwork.height);

  return { x: sourceX, y: sourceY };
}

/** Black ink on a light hem, white ink on a dark hem. */
export function labelInk(background: Rgb): Rgb {
  const luminance =
    (0.2126 * background.r + 0.7152 * background.g + 0.0722 * background.b) /
    255;
  return luminance > 0.55
    ? { r: 0, g: 0, b: 0 }
    : { r: 255, g: 255, b: 255 };
}
