import {
  hemPieceRects,
  mirrorIndex,
  type ColorFrame,
  type HemSide,
  type Rgb,
} from "./hemColor";
import type { MmRect } from "./sheetGeometry";

const pxPerMm = 8;

export type HemPiece = {
  x: number;
  y: number;
  width: number;
  height: number;
  png: string;
};

export type MirroredHem = {
  pieces: HemPiece[];
  /** Colour behind the country name, after the hem is mirrored. */
  labelBackground: Rgb | null;
};

/** Draw the flag, then mirror it across each fold line out to the cut line. */
export async function renderMirroredHem(
  svgText: string,
  artwork: MmRect,
  frame: ColorFrame,
  label: { x: number; y: number },
): Promise<MirroredHem> {
  const sourceWidth = px(artwork.width);
  const sourceHeight = px(artwork.height);
  const source = await renderFlag(svgText, sourceWidth, sourceHeight);
  const pixels = source.data;
  const pieces = hemPieceRects(artwork, frame).map((rect) =>
    piece(
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      px(rect.width),
      px(rect.height),
      pixels,
      sourceWidth,
      sourceHeight,
      locateHemPixel(rect.side, px(rect.width), px(rect.height), sourceWidth, sourceHeight),
    ),
  );

  return {
    pieces,
    labelBackground: sampleLabel(pixels, sourceWidth, sourceHeight, artwork, label),
  };
}

function locateHemPixel(
  side: HemSide,
  destWidth: number,
  destHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): (x: number, y: number) => { sx: number; sy: number } {
  switch (side) {
    case "left":
      return (x, y) => ({
        sx: mirrorIndex(destWidth - 1 - x, sourceWidth),
        sy: y,
      });
    case "right":
      return (x, y) => ({
        sx: sourceWidth - 1 - mirrorIndex(x, sourceWidth),
        sy: y,
      });
    case "top":
      return (x, y) => ({
        sx: x,
        sy: mirrorIndex(destHeight - 1 - y, sourceHeight),
      });
    case "bottom":
      return (x, y) => ({
        sx: x,
        sy: sourceHeight - 1 - mirrorIndex(y, sourceHeight),
      });
    case "top-left":
      return (x, y) => ({
        sx: mirrorIndex(destWidth - 1 - x, sourceWidth),
        sy: mirrorIndex(destHeight - 1 - y, sourceHeight),
      });
    case "top-right":
      return (x, y) => ({
        sx: sourceWidth - 1 - mirrorIndex(x, sourceWidth),
        sy: mirrorIndex(destHeight - 1 - y, sourceHeight),
      });
    case "bottom-left":
      return (x, y) => ({
        sx: mirrorIndex(destWidth - 1 - x, sourceWidth),
        sy: sourceHeight - 1 - mirrorIndex(y, sourceHeight),
      });
    case "bottom-right":
      return (x, y) => ({
        sx: sourceWidth - 1 - mirrorIndex(x, sourceWidth),
        sy: sourceHeight - 1 - mirrorIndex(y, sourceHeight),
      });
  }
}

function px(mm: number): number {
  return Math.max(1, Math.round(mm * pxPerMm));
}

function piece(
  x: number,
  y: number,
  width: number,
  height: number,
  destWidth: number,
  destHeight: number,
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  locate: (x: number, y: number) => { sx: number; sy: number },
): HemPiece {
  const canvas = document.createElement("canvas");
  canvas.width = destWidth;
  canvas.height = destHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the mirrored hem");
  const image = context.createImageData(destWidth, destHeight);
  const dest = image.data;
  for (let row = 0; row < destHeight; row += 1) {
    for (let column = 0; column < destWidth; column += 1) {
      const { sx, sy } = locate(column, row);
      const from =
        (Math.min(sourceHeight - 1, Math.max(0, sy)) * sourceWidth +
          Math.min(sourceWidth - 1, Math.max(0, sx))) *
        4;
      const to = (row * destWidth + column) * 4;
      dest[to] = source[from];
      dest[to + 1] = source[from + 1];
      dest[to + 2] = source[from + 2];
      dest[to + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return { x, y, width, height, png: canvas.toDataURL("image/png") };
}

function sampleLabel(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  artwork: MmRect,
  label: { x: number; y: number },
): Rgb | null {
  const distance = artwork.x - label.x;
  if (distance <= 0) return null;
  const sx = mirrorIndex(Math.round(distance * pxPerMm), sourceWidth);
  const sy = Math.min(
    sourceHeight - 1,
    Math.max(0, Math.round(((label.y - artwork.y) / artwork.height) * (sourceHeight - 1))),
  );
  const index = (sy * sourceWidth + sx) * 4;
  return { r: source[index], g: source[index + 1], b: source[index + 2] };
}

/**
 * The artwork files are 4×3. The hem must stretch them to the finished flag,
 * or the empty sides of that box are rasterized as black bars along the folds.
 */
export function svgForHemRaster(svgText: string, width: number, height: number): string {
  return svgText.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\s(?:width|height|preserveAspectRatio)="[^"]*"/g, "");
    return `<svg${cleaned} width="${width}" height="${height}" preserveAspectRatio="none">`;
  });
}

async function renderFlag(
  svgText: string,
  width: number,
  height: number,
): Promise<ImageData> {
  const sized = svgForHemRaster(svgText, width, height);
  const url = URL.createObjectURL(
    new Blob([sized], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not read the flag");
    // A 1px overscan drops the antialiased edge, which would otherwise
    // mirror as a dark line along the fold.
    const bleed = 1;
    context.drawImage(image, -bleed, -bleed, width + bleed * 2, height + bleed * 2);
    return context.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}
