import type { FlagShape } from "../types/flag";

export type Point = { x: number; y: number };

/**
 * The fly of a swallowtail is notched by this share of its length.
 * Alpha is white and blue in equal halves, with that notch in the blue half.
 */
export const swallowtailNotch = 0.25;

export function swallowtailClipPath(): string {
  const fly = (1 - swallowtailNotch) * 100;
  return `polygon(0% 0%, 100% 0%, ${fly}% 50%, 100% 100%, 0% 100%)`;
}

/**
 * Finished flag edge, in millimetres, origin at the hoist’s top.
 * Y grows downward. A rectangle is the cloth. A swallowtail keeps that
 * width and height, and the fly ends in two points.
 */
export function finishedOutline(
  width: number,
  height: number,
  shape?: FlagShape,
): Point[] {
  if (shape !== "swallowtail") {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];
  }
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width * (1 - swallowtailNotch), y: height / 2 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
}

/** Points are clockwise in a y-down plane, so the left perpendicular points outward. */
export function offsetOutward(points: readonly Point[], distance: number): Point[] {
  const n = points.length;
  const edges = Array.from({ length: n }, (_, index) => {
    const start = points[index];
    const end = points[(index + 1) % n];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    return {
      x: start.x + (dy / length) * distance,
      y: start.y + (-dx / length) * distance,
      dx,
      dy,
    };
  });
  return edges.map((_, index) => {
    const previous = edges[(index - 1 + n) % n];
    const next = edges[index];
    const cross = previous.dx * next.dy - previous.dy * next.dx;
    const s =
      ((next.x - previous.x) * next.dy - (next.y - previous.y) * next.dx) / cross;
    return { x: previous.x + s * previous.dx, y: previous.y + s * previous.dy };
  });
}

export function polygonBounds(points: readonly Point[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    const crosses =
      current.y > point.y !== prior.y > point.y &&
      point.x <
        ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Perpendicular distance from a point to the line through an edge. */
export function edgeDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.abs((point.x - start.x) * dy - (point.y - start.y) * dx) / Math.hypot(dx, dy);
}

/**
 * Where a hem point folds back onto the flag.
 * A flat edge reflects straight across. A corner reflects through the corner.
 */
export function hemSourcePoint(outside: Point, outline: readonly Point[]): Point {
  let bestDistance = Infinity;
  let bestStart = outline[0];
  let bestEnd = outline[1];
  let bestOn = outline[0];
  for (let index = 0; index < outline.length; index += 1) {
    const start = outline[index];
    const end = outline[(index + 1) % outline.length];
    const on = closestOnSegment(outside, start, end);
    if (on.distance < bestDistance) {
      bestDistance = on.distance;
      bestStart = start;
      bestEnd = end;
      bestOn = on.point;
    }
  }
  const across = reflectAcross(outside, bestStart, bestEnd);
  if (pointInPolygon(across, outline)) return across;
  const through = { x: bestOn.x * 2 - outside.x, y: bestOn.y * 2 - outside.y };
  if (pointInPolygon(through, outline)) return through;
  const dx = bestOn.x - outside.x;
  const dy = bestOn.y - outside.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: bestOn.x + (dx / length) * 0.5, y: bestOn.y + (dy / length) * 0.5 };
}

function closestOnSegment(
  point: Point,
  start: Point,
  end: Point,
): { point: Point; distance: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const raw = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const t = Math.min(1, Math.max(0, raw));
  const x = start.x + t * dx;
  const y = start.y + t * dy;
  return { point: { x, y }, distance: Math.hypot(point.x - x, point.y - y) };
}

function reflectAcross(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const x = start.x + t * dx;
  const y = start.y + t * dy;
  return { x: x * 2 - point.x, y: y * 2 - point.y };
}
