import { jsPDF } from "jspdf";
import { printLayout, type PrintLayout } from "../config/print";
import type { Flag } from "../types/flag";
import { renderMirroredHem } from "./flagHem";
import { colorFrame, labelInk, type Rgb } from "./hemColor";
import { fittedLabelFontMm } from "./labelFit";
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
  inkById: ReadonlyMap<string, Rgb> = new Map(),
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
    const ink = inkById.get(flag.id) ?? { r: 0, g: 0, b: 0 };
    doc.setTextColor(ink.r, ink.g, ink.b);
    doc.text(flag.label.text, flag.label.x, flag.label.y, {
      angle: flag.label.angle,
      align: "center",
      baseline: "middle",
    });
  }
}

export async function embedFlagArtwork(
  doc: jsPDF,
  geometry: SheetGeometry,
  svgById: ReadonlyMap<string, string>,
): Promise<Map<string, Rgb>> {
  const { svg2pdf } = await import("svg2pdf.js");
  const inkById = new Map<string, Rgb>();
  for (const placed of geometry.flags) {
    const svgText = svgById.get(placed.id);
    if (!svgText) continue;
    const hem = await renderMirroredHem(
      svgText,
      placed.artwork,
      colorFrame(placed),
      placed.label,
    );
    if (hem.labelBackground) {
      inkById.set(placed.id, labelInk(hem.labelBackground));
    }
    for (const part of hem.pieces) {
      doc.addImage(part.png, "PNG", part.x, part.y, part.width, part.height);
    }
    const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const element = parsed.documentElement;
    await svg2pdf(element, doc, {
      x: placed.artwork.x,
      y: placed.artwork.y,
      width: placed.artwork.width,
      height: placed.artwork.height,
    });
  }
  return inkById;
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
): Promise<jsPDF> {
  const geometry = buildSheetGeometry(flags, columns, rows);
  const doc = new jsPDF({
    unit: "mm",
    format: [geometry.pageWidthMm, geometry.pageHeightMm],
    orientation:
      geometry.pageWidthMm > geometry.pageHeightMm ? "landscape" : "portrait",
  });
  const svgById = await loadFlagSvgs(flags.slice(0, geometry.flags.length));
  const inkById = await embedFlagArtwork(doc, geometry, svgById);
  drawSheetMarks(doc, geometry, printLayout, inkById);
  return doc;
}

export async function downloadSheetPdf(
  flags: readonly Flag[],
  columns: number,
  rows: number,
) {
  const doc = await buildSheetPdf(flags, columns, rows);
  doc.save("courtesy-flags.pdf");
}
