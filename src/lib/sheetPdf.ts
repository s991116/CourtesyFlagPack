import { jsPDF } from "jspdf";
import { printLayout, type PrintLayout } from "../config/print";
import type { Flag } from "../types/flag";
import { renderPrintImage } from "./flagHem";
import {
  clipAndFlipSvg,
  flagNeedsRaster,
  inlineSvgUses,
  stretchFlagArtwork,
  stripClipPaintOpacity,
  svgViewBox,
} from "./flagSvg";
import { colorFrame, hemPieceRects } from "./hemColor";
import {
  bleedIntoArtwork,
  hemFlipTransform,
  intersectRects,
  mirrorDesign,
  viewBoxSlice,
} from "./hemMirror";
import { rgbaToCmykInk, useCmykColors } from "./cmyk";
import { encodeCmykJpeg } from "./cmykJpeg";
import type { FlagCloth } from "../data/sheet";
import type { FlagFit } from "./flagSize";
import { fittedLabelFontMm, labelBaselineFromCutMm, labelOutlineEm } from "./labelFit";
import { labelFontFamily, registerLabelFont } from "./labelFont";
import { sheetFileName } from "./printArea";
import { buildSheetGeometry, type MmRect, type SheetGeometry } from "./sheetGeometry";

/** jsPDF starts every page in DeviceGray. The sheet is CMYK from the first operator. */
function createPrintDocument(widthMm: number, heightMm: number): jsPDF {
  const doc = new jsPDF({
    unit: "mm",
    format: [widthMm, heightMm],
    orientation: widthMm > heightMm ? "landscape" : "portrait",
    putOnlyUsedFonts: true,
    strokeColor: "0. 0. 0. 1. K",
    fillColor: "0. 0. 0. 0. k",
    textColor: "0. 0. 0. 1. k",
  } as unknown as ConstructorParameters<typeof jsPDF>[0]);
  useCmykColors(doc);
  registerLabelFont(doc);
  return doc;
}

/**
 * A four-component JPEG in DeviceCMYK.
 * The bytes are the ordinary DCT image a RIP already knows how to paint.
 */
export function addCmykImage(
  doc: jsPDF,
  pixels: Uint8Array | Uint8ClampedArray,
  pixelWidth: number,
  pixelHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const channels = pixels.length === pixelWidth * pixelHeight * 3 ? 3 : 4;
  const ink = rgbaToCmykInk(pixels, channels);
  const jpeg = encodeCmykJpeg(pixelWidth, pixelHeight, ink);
  doc.addImage(jpeg, "JPEG", x, y, width, height);
}

export function createSheetDocument(
  geometry: SheetGeometry,
  layout: PrintLayout = printLayout,
): jsPDF {
  const doc = createPrintDocument(geometry.pageWidthMm, geometry.pageHeightMm);
  drawSheetMarks(doc, geometry, layout);
  return doc;
}

export function drawSheetMarks(
  doc: jsPDF,
  geometry: SheetGeometry,
  layout: PrintLayout = printLayout,
) {
  doc.setDrawColor(0, 0, 0, 1);
  doc.setTextColor(0, 0, 0, 1);
  doc.setFont(labelFontFamily, "normal");

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
    doc.setDrawColor(0, 0, 0, 0);
    doc.setTextColor(0, 0, 0, 1);
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
  useCmykColors(doc);
  const { svg2pdf } = await import("svg2pdf.js");
  for (const placed of geometry.flags) {
    const svgText = svgById.get(placed.id);
    if (!svgText) continue;
    const printable = stretchFlagArtwork(stripClipPaintOpacity(svgText));
    const view = svgViewBox(printable);
    const raster = Boolean(placed.outline) || !view || flagNeedsRaster(printable);
    if (raster) {
      const image = await renderPrintImage(
        printable,
        placed.artwork,
        colorFrame(placed),
        placed.design,
        placed.outline,
        placed.cutOutline,
      );
      addCmykImage(
        doc,
        image.pixels,
        image.pixelWidth,
        image.pixelHeight,
        image.x,
        image.y,
        image.width,
        image.height,
      );
      continue;
    }
    const frame = colorFrame(placed);
    doc.setFillColor(0, 0, 0, 0);
    if (
      placed.design.width < placed.artwork.width - 0.05 ||
      placed.design.height < placed.artwork.height - 0.05
    ) {
      doc.rect(placed.artwork.x, placed.artwork.y, placed.artwork.width, placed.artwork.height, "F");
    }
    const inlined = inlineSvgUses(printable);
    for (const piece of hemPieceRects(placed.artwork, frame)) {
      doc.setFillColor(0, 0, 0, 0);
      doc.rect(piece.x, piece.y, piece.width, piece.height, "F");
      const placedDesign = mirrorDesign(placed.design, placed.artwork, piece.side);
      const overlap = intersectRects(piece, placedDesign);
      if (!overlap) continue;
      const slice = viewBoxSlice(view, placedDesign, bleedIntoArtwork(overlap, placed.artwork));
      const flipped = clipAndFlipSvg(inlined, slice, hemFlipTransform(view, piece.side));
      await drawSvg(doc, svg2pdf, flipped, placedDesign);
    }
    await drawSvg(doc, svg2pdf, inlined, placed.design);
  }
}

async function drawSvg(
  doc: jsPDF,
  svg2pdf: (
    element: Element,
    pdf: jsPDF,
    options: { x: number; y: number; width: number; height: number },
  ) => Promise<jsPDF>,
  svgText: string,
  rect: MmRect,
) {
  const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
  await svg2pdf(parsed.documentElement, doc, {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  });
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
  const doc = createPrintDocument(geometry.pageWidthMm, geometry.pageHeightMm);
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
