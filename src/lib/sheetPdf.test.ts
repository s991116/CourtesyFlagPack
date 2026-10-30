import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { printLayout } from "../config/print";
import type { Flag } from "../types/flag";
import {
  fittedLabelFontMm,
  labelAscentEm,
  labelDescentEm,
  labelBaselineFromCutMm,
  labelOutlineEm,
} from "./labelFit";
import { labelFontFamily } from "./labelFont";
import { addCmykImage, createSheetDocument } from "./sheetPdf";
import { buildSheetGeometry } from "./sheetGeometry";

function textAnchor(
  output: string,
  name: string,
  pageHeightMm: number,
): { xMm: number; yFromTop: number } {
  return textAnchors(output, name, pageHeightMm)[0];
}

function textAnchors(
  output: string,
  name: string,
  pageHeightMm: number,
): { xMm: number; yFromTop: number }[] {
  const pointsPerMm = 72 / 25.4;
  return output
    .split("BT")
    .filter((part) => part.includes(`(${name})`))
    .map((part) => {
      const match = part.match(
        /([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) Tm/,
      );
      if (!match) throw new Error(`No text position for ${name}`);
      return {
        xMm: Number(match[5]) / pointsPerMm,
        yFromTop: pageHeightMm - Number(match[6]) / pointsPerMm,
      };
    });
}

function flag(id: string, height: number, length: number, label: string): Flag {
  return {
    id,
    iso: id,
    labels: [label],
    hemLabel: label,
    ratio: { height, length },
    asset: { svg: `/flags/${id}.svg` },
    region: "Europe",
    kind: "national",
  };
}

describe("sheet pdf page", () => {
  it("uses the geometry page size and includes the country name", () => {
    const geometry = buildSheetGeometry([flag("dk", 28, 37, "Denmark")], 2, 2);
    const doc = createSheetDocument(geometry);

    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(geometry.pageWidthMm);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(geometry.pageHeightMm);
    const output = doc.output();
    expect(output).toContain("Denmark");
    expect(output).toContain("/FontFile2");
    expect(output).not.toContain("/BaseFont /Helvetica");
    expect(output).not.toContain("/Subtype /Type1");
    const placed = geometry.flags[0];
    const pointsPerMm = 72 / 25.4;
    expect(doc.getFontSize() / pointsPerMm).toBeCloseTo(
      (printLayout.hemMm * printLayout.labelCoverage) /
        (labelAscentEm + labelDescentEm + labelOutlineEm),
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
      doc.setFont(labelFontFamily, "normal");
      doc.setFontSize(pointsPerMm);
      const fontMm = fittedLabelFontMm(
        printLayout.hemMm,
        placed.cut.height,
        doc.getTextWidth(placed.label.text),
      );
      doc.setFontSize(fontMm * pointsPerMm);

      expect(
        fontMm * (labelAscentEm + labelDescentEm + labelOutlineEm),
      ).toBeLessThanOrEqual(printLayout.hemMm * printLayout.labelCoverage + 1e-9);
      expect(doc.getTextWidth(placed.label.text) + fontMm * labelOutlineEm).toBeLessThanOrEqual(
        placed.cut.height + 1e-9,
      );
      expect(placed.label.x).toBeCloseTo(placed.cut.x + printLayout.hemMm / 2);
      expect(placed.label.x).toBeLessThan(placed.artwork.x);
    }
  });

  it("prints United Kingdom in black, centered in its own left hem", () => {
    const geometry = buildSheetGeometry(
      [
        flag("fi", 11, 18, "Finland"),
        flag("gb", 1, 2, "United Kingdom"),
        flag("pl", 5, 8, "Poland"),
        flag("lt", 3, 5, "Lithuania"),
      ],
      2,
      2,
    );
    const doc = createSheetDocument(geometry);
    const placed = geometry.flags[1];
    const finland = geometry.flags[0];
    const pointsPerMm = 72 / 25.4;
    doc.setFont(labelFontFamily, "normal");
    doc.setFontSize(pointsPerMm);
    const fontMm = fittedLabelFontMm(
      printLayout.hemMm,
      placed.cut.height,
      doc.getTextWidth(placed.label.text),
    );
    doc.setFontSize(fontMm * pointsPerMm);
    const textWidthMm = doc.getTextWidth(placed.label.text);
    const anchor = textAnchor(doc.output(), "United Kingdom", geometry.pageHeightMm);

    expect(anchor.xMm).toBeCloseTo(
      placed.cut.x + labelBaselineFromCutMm(printLayout.hemMm, fontMm),
      1,
    );
    const halo = (fontMm * labelOutlineEm) / 2;
    const clearance = (printLayout.hemMm * (1 - printLayout.labelCoverage)) / 2;
    expect(anchor.xMm - fontMm * labelAscentEm - halo - placed.cut.x).toBeCloseTo(
      clearance,
      1,
    );
    expect(
      placed.artwork.x - (anchor.xMm + fontMm * labelDescentEm + halo),
    ).toBeCloseTo(clearance, 1);
    expect(anchor.xMm).toBeGreaterThan(finland.cut.x + finland.cut.width);
    expect(anchor.yFromTop - textWidthMm / 2).toBeCloseTo(placed.label.y, 1);
    const output = doc.output();
    const [outline, fill] = textAnchors(output, "United Kingdom", geometry.pageHeightMm);
    expect(fill).toEqual(outline);
    const blocks = output.split("BT").filter((part) => part.includes("(United Kingdom)"));
    const shownAt = output.indexOf("(United Kingdom)");
    const beforeText = output.slice(Math.max(0, shownAt - 350), shownAt);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatch(/\n1 Tr\n/);
    expect(blocks[1]).toMatch(/0\. 0\. 0\. 1\. k\n/);
    expect(blocks[1]).toMatch(/\n0 Tr\n/);
    expect(beforeText).toMatch(/0\. 0\. 0\. 0\. K\n/);
    const widths = [...beforeText.matchAll(/([\d.]+) w/g)].map((match) => Number(match[1]));
    expect(widths.at(-1)! / pointsPerMm).toBeCloseTo(fontMm * labelOutlineEm, 2);
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

describe("print image", () => {
  it("stores the flag as a four-component JPEG in DeviceCMYK", () => {
    const width = 8;
    const height = 8;
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 198;
      rgba[i + 1] = 12;
      rgba[i + 2] = 48;
      rgba[i + 3] = 255;
    }
    const doc = new jsPDF({ unit: "mm", format: [200, 100] });
    addCmykImage(doc, rgba, width, height, 0, 0, 90, 12);

    const output = doc.output();
    const image = output.slice(output.indexOf("/Subtype /Image"));
    expect(image).toContain("/Filter /DCTDecode");
    expect(image).toContain("/ColorSpace /DeviceCMYK");
    expect(image).toContain("/Decode [1 0 1 0 1 0 1 0]");
    expect(image).not.toContain("/DeviceRGB");
    expect(image).not.toContain("/SMask");
    expect(output).not.toMatch(/[\d.]+ [\d.]+ [\d.]+ rg/);
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    let sof = -1;
    for (let i = 0; i < bytes.length - 9; i += 1) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xc0) {
        sof = i + 1;
        break;
      }
    }
    expect(sof).toBeGreaterThan(0);
    expect(bytes[sof + 8]).toBe(4);
  });
});
