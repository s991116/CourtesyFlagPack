import type { HemSide } from "./hemColor";
import type { MmRect } from "./sheetGeometry";

export type ViewBox = { x: number; y: number; width: number; height: number };

/**
 * The design rectangle reflected across the fold on this side of the flag.
 * The box sits outside the artwork. A flip of the picture still has to be
 * applied, or the box only moves the upright flag.
 */
export function mirrorDesign(design: MmRect, artwork: MmRect, side: HemSide): MmRect {
  return {
    x: flipsX(side) ? mirrorStart(design.x, design.width, verticalEdge(artwork, side)) : design.x,
    y: flipsY(side) ? mirrorStart(design.y, design.height, horizontalEdge(artwork, side)) : design.y,
    width: design.width,
    height: design.height,
  };
}

/** Overlap of two rectangles, or null when they only touch. */
export function intersectRects(a: MmRect, b: MmRect): MmRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right - x < 0.01 || bottom - y < 0.01) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Grow the hem slice a fraction into the flag, along the fold only.
 * The flag is drawn afterwards and covers that sliver, so the fold
 * does not show a white hairline.
 */
export function bleedIntoArtwork(overlap: MmRect, artwork: MmRect): MmRect {
  const bleed = 0.2;
  const near = 0.05;
  let { x, y, width, height } = overlap;
  if (Math.abs(x + width - artwork.x) < near) width += bleed;
  if (Math.abs(x - (artwork.x + artwork.width)) < near) {
    x -= bleed;
    width += bleed;
  }
  if (Math.abs(y + height - artwork.y) < near) height += bleed;
  if (Math.abs(y - (artwork.y + artwork.height)) < near) {
    y -= bleed;
    height += bleed;
  }
  return { x, y, width, height };
}

/**
 * Flip the picture inside its viewBox so the edge that sat on the fold
 * stays on the fold. SVG applies the right-hand transform first.
 */
export function hemFlipTransform(view: ViewBox, side: HemSide): string {
  const { x, y, width, height } = view;
  const tx = 2 * x + width;
  const ty = 2 * y + height;
  if (flipsX(side) && flipsY(side)) return `translate(${num(tx)} ${num(ty)}) scale(-1 -1)`;
  if (flipsX(side)) return `translate(${num(tx)} 0) scale(-1 1)`;
  if (flipsY(side)) return `translate(0 ${num(ty)}) scale(1 -1)`;
  return "";
}

/** Page rectangle inside a viewBox that is mapped onto `placed`. */
export function viewBoxSlice(view: ViewBox, placed: MmRect, page: MmRect): ViewBox {
  return {
    x: view.x + ((page.x - placed.x) / placed.width) * view.width,
    y: view.y + ((page.y - placed.y) / placed.height) * view.height,
    width: (page.width / placed.width) * view.width,
    height: (page.height / placed.height) * view.height,
  };
}

function flipsX(side: HemSide): boolean {
  return side === "left" || side === "right" || side.endsWith("-left") || side.endsWith("-right");
}

function flipsY(side: HemSide): boolean {
  return side === "top" || side === "bottom" || side.startsWith("top") || side.startsWith("bottom");
}

function verticalEdge(artwork: MmRect, side: HemSide): number {
  return side === "left" || side.endsWith("-left") ? artwork.x : artwork.x + artwork.width;
}

function horizontalEdge(artwork: MmRect, side: HemSide): number {
  return side === "top" || side.startsWith("top") ? artwork.y : artwork.y + artwork.height;
}

function mirrorStart(start: number, size: number, edge: number): number {
  return 2 * edge - (start + size);
}

function num(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}
