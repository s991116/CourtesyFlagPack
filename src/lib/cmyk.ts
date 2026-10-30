import type { jsPDF } from "jspdf";

/**
 * sRGB to DeviceCMYK, with the black pulled out of the other inks.
 * Vector fills and raster pixels share this so a red in the flag and the
 * same red in the hem are the same four numbers.
 */
export function rgbToCmyk(r: number, g: number, b: number): [number, number, number, number] {
  const red = clamp255(r) / 255;
  const green = clamp255(g) / 255;
  const blue = clamp255(b) / 255;
  const k = 1 - Math.max(red, green, blue);
  if (k > 0.999999) return [0, 0, 0, 1];
  const scale = 1 / (1 - k);
  return [
    clamp01((1 - red - k) * scale),
    clamp01((1 - green - k) * scale),
    clamp01((1 - blue - k) * scale),
    clamp01(k),
  ];
}

/** Opaque ink bytes, 0 = none and 255 = full. Alpha is flattened onto white. */
export function rgbaToCmykInk(
  pixels: Uint8Array | Uint8ClampedArray,
  channels: 3 | 4,
): Uint8Array {
  const out = new Uint8Array((pixels.length / channels) * 4);
  for (let i = 0, j = 0; i < pixels.length; i += channels, j += 4) {
    const alpha = channels === 4 ? pixels[i + 3] / 255 : 1;
    const [c, m, y, k] = rgbToCmyk(
      pixels[i] * alpha + 255 * (1 - alpha),
      pixels[i + 1] * alpha + 255 * (1 - alpha),
      pixels[i + 2] * alpha + 255 * (1 - alpha),
    );
    out[j] = Math.round(c * 255);
    out[j + 1] = Math.round(m * 255);
    out[j + 2] = Math.round(y * 255);
    out[j + 3] = Math.round(k * 255);
  }
  return out;
}

const cmykDocs = new WeakSet<jsPDF>();

/**
 * svg2pdf paints with three RGB numbers. jsPDF writes those as `rg`.
 * Four numbers are DeviceCMYK (`k` / `K`). A single gray number is black ink.
 */
export function useCmykColors(doc: jsPDF): void {
  if (cmykDocs.has(doc)) return;
  cmykDocs.add(doc);
  const fill = doc.setFillColor.bind(doc);
  const draw = doc.setDrawColor.bind(doc);
  const text = doc.setTextColor.bind(doc);
  doc.setFillColor = ((...args: unknown[]) =>
    fill(...toCmykArgs(args))) as typeof doc.setFillColor;
  doc.setDrawColor = ((...args: unknown[]) =>
    draw(...toCmykArgs(args))) as typeof doc.setDrawColor;
  doc.setTextColor = ((...args: unknown[]) =>
    text(...toCmykArgs(args))) as typeof doc.setTextColor;
}

function toCmykArgs(args: unknown[]): [number, number, number, number] {
  if (typeof args[0] === "string") {
    const rgb = hexToRgb(args[0]);
    if (rgb) return rgbToCmyk(rgb.r, rgb.g, rgb.b);
  }
  const nums = args.filter((value): value is number => typeof value === "number");
  if (nums.length >= 4) return [nums[0], nums[1], nums[2], nums[3]];
  if (nums.length === 1) return [0, 0, 0, clamp01(1 - nums[0] / 255)];
  if (nums.length >= 3) return rgbToCmyk(nums[0], nums[1], nums[2]);
  return [0, 0, 0, 1];
}

function hexToRgb(value: string): { r: number; g: number; b: number } | null {
  const hex = value.trim();
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(hex);
  if (!match) return null;
  const body = match[1].length === 3
    ? match[1].split("").map((digit) => digit + digit).join("")
    : match[1];
  const parsed = Number.parseInt(body, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

function clamp255(value: number): number {
  return Math.min(255, Math.max(0, value));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
