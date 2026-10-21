import { describe, expect, it } from "vitest";
import { printLayout } from "../config/print";
import type { Flag } from "../types/flag";
import { fittedLabelFontMm } from "./labelFit";
import { createSheetDocument } from "./sheetPdf";
import { buildSheetGeometry } from "./sheetGeometry";

function flag(id: string, height: number, length: number, label: string): Flag {
  return {
    id,
    iso: id,
    labels: [label],
    hemLabel: label,
    ratio: { height, length },
    asset: { svg: `/flags/${id}.svg` },
    region: "Nordic",
  };
}

describe("sheet pdf page", () => {
  it("uses the geometry page size and includes the country name", () => {
    const geometry = buildSheetGeometry([flag("dk", 28, 37, "Denmark")], 2, 2);
    const doc = createSheetDocument(geometry);

    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(geometry.pageWidthMm);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(geometry.pageHeightMm);
    expect(doc.output()).toContain("Denmark");
    const placed = geometry.flags[0];
    const pointsPerMm = 72 / 25.4;
    expect(doc.getFontSize() / pointsPerMm).toBeCloseTo(
      printLayout.hemMm * printLayout.labelCoverage,
      1,
    );
    expect(doc.getTextWidth("Denmark")).toBeLessThanOrEqual(placed.cut.height);
  });

  it("keeps Sweden and Croatia inside the left fold", () => {
    const geometry = buildSheetGeometry(
      [
        flag("it", 2, 3, "Italy"),
        flag("hr", 1, 2, "Croatia"),
        flag("gb", 1, 2, "United Kingdom"),
        flag("se", 5, 8, "Sweden"),
      ],
      2,
      2,
    );
    const doc = createSheetDocument(geometry);
    const pointsPerMm = 72 / 25.4;

    for (const placed of geometry.flags) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(pointsPerMm);
      const fontMm = fittedLabelFontMm(
        printLayout.hemMm,
        placed.cut.height,
        doc.getTextWidth(placed.label.text),
      );
      doc.setFontSize(fontMm * pointsPerMm);

      expect(fontMm).toBeLessThanOrEqual(printLayout.hemMm * printLayout.labelCoverage);
      expect(doc.getTextWidth(placed.label.text)).toBeLessThanOrEqual(placed.cut.height);
      expect(placed.label.x).toBeCloseTo(placed.cut.x + printLayout.hemMm / 2);
      expect(placed.label.x).toBeLessThan(placed.artwork.x);
    }
  });

  it("draws the cut and fold lines with their dash patterns", () => {
    const geometry = buildSheetGeometry(
      [flag("gb", 1, 2, "United Kingdom"), flag("dk", 28, 37, "Denmark")],
      2,
      2,
    );
    const output = createSheetDocument(geometry).output();
    // 2 mm and 1 mm strokes, then 2.5 mm and 1.5 mm dashes, in PDF points.
    expect(output).toMatch(/5\.669\d* w/);
    expect(output).toMatch(/2\.834\d* w/);
    expect(output).toMatch(/\[7\.086\d* 7\.086\d*\]/);
    expect(output).toMatch(/\[4\.251\d* 4\.251\d*\]/);
  });
});
