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

/**
 * Lossless Flate packing with the Sub predictor.
 * Paeth ("SLOW") is also lossless, but Acrobat undoes it pixel by pixel and
 * the hem images are large, so the file is slow to open. Sub stays far
 * smaller than the raw pixels and is a single addition per byte.
 */
export function addHemImage(
  doc: jsPDF,
  png: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  doc.addImage(png, "PNG", x, y, width, height, undefined, "FAST");
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
      addHemImage(doc, hem.png, hem.x, hem.y, hem.width, hem.height);
    } else {
      const hem = await renderMirroredHem(
        printable,
        placed.artwork,
        colorFrame(placed),
        placed.label,
        placed.design,
      );
      for (const part of hem.pieces) {
        addHemImage(doc, part.png, part.x, part.y, part.width, part.height);
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
