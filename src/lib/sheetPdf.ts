import { jsPDF } from "jspdf";
import { printLayout, type PrintLayout } from "../config/print";
import type { Flag } from "../types/flag";
import { renderMirroredHem, renderShapedHem } from "./flagHem";
import { inlineSvgUses, stretchFlagArtwork, stripClipPaintOpacity } from "./flagSvg";
import { colorFrame } from "./hemColor";
import type { FlagCloth } from "../data/sheet";
import type { FlagFit } from "./flagSize";
import { fittedLabelFontMm, labelBaselineFromCutMm, labelOutlineEm } from "./labelFit";
import { sheetFileName } from "./printArea";
import { buildSheetGeometry, type SheetGeometry } from "./sheetGeometry";

type PackedImage = {
  data: string;
  alpha?: string;
  filter?: string;
};

/**
 * Lossless Flate of the raw pixels, with no PNG predictor.
 * A predictor keeps the file small, but Acrobat then rebuilds every hem pixel
 * from its neighbours, and a 25-flag sheet is about 95 MB of pixels. Plain
 * Flate stays small on flat colour and Acrobat inflates it directly.
 */
export async function addHemImage(
  doc: jsPDF,
  pixels: Uint8Array | Uint8ClampedArray,
  pixelWidth: number,
  pixelHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const rgba = pixels instanceof Uint8ClampedArray ? pixels : new Uint8ClampedArray(pixels);
  doc.addImage({ data: rgba, width: pixelWidth, height: pixelHeight }, "RGBA", x, y, width, height);
  for (const image of Object.values(hemImages(doc))) {
    if (image.filter === "FlateDecode") continue;
    const packed = await deflateBytes(binaryToBytes(image.data));
    image.data = bytesToBinary(packed);
    image.filter = "FlateDecode";
    delete image.alpha;
  }
}

async function deflateBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const body = new Uint8Array(bytes);
  const stream = new Blob([body]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function binaryToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) bytes[i] = value.charCodeAt(i) & 255;
  return bytes;
}

function bytesToBinary(bytes: Uint8Array): string {
  const parts: string[] = [];
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunk)));
  }
  return parts.join("");
}

function hemImages(doc: jsPDF): Record<string, PackedImage> {
  const collections = (doc as unknown as {
    internal: { collections: Record<string, Record<string, PackedImage>> };
  }).internal.collections;
  return collections.addImage_images;
}

export function createSheetDocument(
  geometry: SheetGeometry,
  layout: PrintLayout = printLayout,
): jsPDF {
  const doc = new jsPDF({
    unit: "mm",
    format: [geometry.pageWidthMm, geometry.pageHeightMm],
    orientation:
      geometry.pageWidthMm > geometry.pageHeightMm ? "landscape" : "portrait",
  });
  drawSheetMarks(doc, geometry, layout);
  return doc;
}

export function drawSheetMarks(
  doc: jsPDF,
  geometry: SheetGeometry,
  layout: PrintLayout = printLayout,
) {
  doc.setDrawColor(0);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");

  for (const kind of ["cut", "fold"] as const) {
    const stroke = kind === "cut" ? layout.cutStrokeMm : layout.foldStrokeMm;
    const dash = kind === "cut" ? layout.cutDashMm : layout.foldDashMm;
    const gap = kind === "cut" ? layout.cutGapMm : layout.foldGapMm;
    doc.setLineWidth(stroke);
    doc.setLineDashPattern([dash, gap], 0);
    for (const mark of geometry.marks) {
      if (mark.kind !== kind) continue;
      doc.line(mark.x1, mark.y1, mark.x2, mark.y2);
    }
  }
  doc.setLineDashPattern([], 0);

  for (const flag of geometry.flags) {
    const pointsPerMm = 72 / 25.4;
    doc.setFontSize(pointsPerMm);
    const widthPerMm = doc.getTextWidth(flag.label.text);
    const fontMm = fittedLabelFontMm(
      layout.hemMm,
      flag.cut.height,
      widthPerMm,
      layout.labelCoverage,
    );
    doc.setFontSize(fontMm * pointsPerMm);
    doc.setDrawColor(255);
    doc.setTextColor(0);
    doc.setLineWidth(fontMm * labelOutlineEm);
    doc.setLineJoin("round");
    doc.setLineCap("round");
    // jsPDF applies alignment before it rotates, so a centered vertical name
    // slides sideways by half its length. A 90° name runs upward, and a
    // descender extends toward the flag, so the baseline is inset far enough
    // that the white outline around g stays in the fold. The white stroke is
    // drawn first and the black fill on top, so the outline stays outside the letter.
    const textWidthMm = doc.getTextWidth(flag.label.text);
    const textX = flag.cut.x + labelBaselineFromCutMm(layout.hemMm, fontMm);
    const textY = flag.label.y + textWidthMm / 2;
    const textOptions = {
      angle: flag.label.angle,
      align: "left" as const,
      baseline: "alphabetic" as const,
    };
    doc.text(flag.label.text, textX, textY, {
      ...textOptions,
      renderingMode: "stroke",
    });
    doc.text(flag.label.text, textX, textY, {
      ...textOptions,
      renderingMode: "fill",
    });
  }
}

export async function embedFlagArtwork(
  doc: jsPDF,
  geometry: SheetGeometry,
  svgById: ReadonlyMap<string, string>,
): Promise<void> {
  const { svg2pdf } = await import("svg2pdf.js");
  for (const placed of geometry.flags) {
    const svgText = svgById.get(placed.id);
    if (!svgText) continue;
    const printable = stretchFlagArtwork(stripClipPaintOpacity(svgText));
    if (placed.outline && placed.cutOutline) {
      const hem = await renderShapedHem(
        printable,
        placed.artwork,
        placed.outline,
        placed.cutOutline,
      );
      await addHemImage(
        doc,
        hem.pixels,
        hem.pixelWidth,
        hem.pixelHeight,
        hem.x,
        hem.y,
        hem.width,
        hem.height,
      );
    } else {
      const hem = await renderMirroredHem(
        printable,
        placed.artwork,
        colorFrame(placed),
        placed.label,
        placed.design,
      );
      for (const part of hem.pieces) {
        await addHemImage(
          doc,
          part.pixels,
          part.pixelWidth,
          part.pixelHeight,
          part.x,
          part.y,
          part.width,
          part.height,
        );
      }
    }
    if (
      !placed.outline &&
      (placed.design.width < placed.artwork.width - 0.05 ||
        placed.design.height < placed.artwork.height - 0.05)
    ) {
      doc.setFillColor(255, 255, 255);
      doc.rect(
        placed.artwork.x,
        placed.artwork.y,
        placed.artwork.width,
        placed.artwork.height,
        "F",
      );
    }
    const parsed = new DOMParser().parseFromString(inlineSvgUses(printable), "image/svg+xml");
    const element = parsed.documentElement;
    await svg2pdf(element, doc, {
      x: placed.design.x,
      y: placed.design.y,
      width: placed.design.width,
      height: placed.design.height,
    });
  }
}

export async function loadFlagSvgs(
  flags: readonly Flag[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    flags.map(async (flag) => {
      const response = await fetch(flag.asset.svg);
      if (!response.ok) {
        throw new Error(`Could not load ${flag.asset.svg}`);
      }
      return [flag.id, await response.text()] as const;
    }),
  );
  return new Map(entries);
}

export async function buildSheetPdf(
  flags: readonly Flag[],
  columns: number,
  rows: number,
  cloth: FlagCloth,
  fit: FlagFit,
): Promise<jsPDF> {
  const geometry = buildSheetGeometry(flags, columns, rows, printLayout, cloth, fit);
  const doc = new jsPDF({
    unit: "mm",
    format: [geometry.pageWidthMm, geometry.pageHeightMm],
    orientation:
      geometry.pageWidthMm > geometry.pageHeightMm ? "landscape" : "portrait",
  });
  const svgById = await loadFlagSvgs(flags.slice(0, geometry.flags.length));
  await embedFlagArtwork(doc, geometry, svgById);
  drawSheetMarks(doc, geometry, printLayout);
  return doc;
}

export async function downloadSheetPdf(
  flags: readonly Flag[],
  columns: number,
  rows: number,
  cloth: FlagCloth,
  fit: FlagFit,
) {
  const doc = await buildSheetPdf(flags, columns, rows, cloth, fit);
  const widthMm = doc.internal.pageSize.getWidth();
  const heightMm = doc.internal.pageSize.getHeight();
  doc.save(sheetFileName(widthMm, heightMm));
}
