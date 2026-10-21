import { jsPDF } from "jspdf";
import { printLayout, type PrintLayout } from "../config/print";
import type { Flag } from "../types/flag";
import { renderMirroredHem } from "./flagHem";
import { stripClipPaintOpacity } from "./flagSvg";
import { colorFrame } from "./hemColor";
import type { FlagProportion } from "./flagSize";
import { fittedLabelFontMm, labelBaselineFromCutMm } from "./labelFit";
import { buildSheetGeometry, type SheetGeometry } from "./sheetGeometry";

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
    doc.setTextColor(0);
    // jsPDF applies alignment before it rotates, so a centered vertical name
    // slides sideways by half its length. A 90° name runs upward, and a
    // descender extends toward the flag, so the baseline is inset far enough
    // that g stays in the fold.
    const textWidthMm = doc.getTextWidth(flag.label.text);
    doc.text(
      flag.label.text,
      flag.cut.x + labelBaselineFromCutMm(layout.hemMm, fontMm),
      flag.label.y + textWidthMm / 2,
      {
        angle: flag.label.angle,
        align: "left",
        baseline: "alphabetic",
      },
    );
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
    const printable = stripClipPaintOpacity(svgText);
    const hem = await renderMirroredHem(
      printable,
      placed.artwork,
      colorFrame(placed),
      placed.label,
    );
    for (const part of hem.pieces) {
      doc.addImage(part.png, "PNG", part.x, part.y, part.width, part.height);
    }
    const parsed = new DOMParser().parseFromString(printable, "image/svg+xml");
    const element = parsed.documentElement;
    await svg2pdf(element, doc, {
      x: placed.artwork.x,
      y: placed.artwork.y,
      width: placed.artwork.width,
      height: placed.artwork.height,
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
  proportion: FlagProportion = "original",
): Promise<jsPDF> {
  const geometry = buildSheetGeometry(flags, columns, rows, printLayout, proportion);
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
  proportion: FlagProportion = "original",
) {
  const doc = await buildSheetPdf(flags, columns, rows, proportion);
  doc.save("courtesy-flags.pdf");
}
