import { inflateSync } from "node:zlib";
import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { printLayout } from "../config/print";
import type { Flag } from "../types/flag";
import {
  fittedLabelFontMm,
  helveticaAscentEm,
  helveticaDescentEm,
  labelBaselineFromCutMm,
  labelOutlineEm,
} from "./labelFit";
import { addHemImage, createSheetDocument } from "./sheetPdf";
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
    expect(doc.output()).toContain("Denmark");
    const placed = geometry.flags[0];
    const pointsPerMm = 72 / 25.4;
    expect(doc.getFontSize() / pointsPerMm).toBeCloseTo(
      (printLayout.hemMm * printLayout.labelCoverage) /
        (helveticaAscentEm + helveticaDescentEm + labelOutlineEm),
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

      expect(
        fontMm * (helveticaAscentEm + helveticaDescentEm + labelOutlineEm),
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
    doc.setFont("helvetica", "normal");
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
    expect(anchor.xMm - fontMm * helveticaAscentEm - halo - placed.cut.x).toBeCloseTo(
      clearance,
      1,
    );
    expect(
      placed.artwork.x - (anchor.xMm + fontMm * helveticaDescentEm + halo),
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
    expect(blocks[1]).toMatch(/\n0\.? g\n/);
    expect(blocks[1]).toMatch(/\n0 Tr\n/);
    expect(beforeText).toMatch(/1\. G\n/);
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

describe("hem image compression", () => {
  it("stores the same pixels in a plain Flate stream", async () => {
    const width = 900;
    const height = 80;
    const pixels = stripePixels(width, height);
    const rgba = rgbaPixels(pixels);
    const doc = new jsPDF({ unit: "mm", format: [200, 100] });
    await addHemImage(doc, rgba, width, height, 0, 0, 90, 12);
    const raw = new jsPDF({ unit: "mm", format: [200, 100] });
    raw.addImage({ data: rgba, width, height }, "RGBA", 0, 0, 90, 12);

    const output = doc.output();
    const image = output.slice(output.indexOf("/Subtype /Image"));
    expect(image).toContain("/Filter /FlateDecode");
    expect(image).not.toContain("/Predictor");
    expect(image).toContain("/ColorSpace /DeviceRGB");
    expect(image).not.toContain("/SMask");
    expect(doc.output("arraybuffer").byteLength).toBeLessThan(
      raw.output("arraybuffer").byteLength / 5,
    );
    expect(decodeHemImage(output)).toEqual(pixels);
  });
});

function stripePixels(width: number, height: number): Uint8Array {
  const pixels = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const band = Math.floor((y / height) * 3);
    const color = [
      [198, 12, 48],
      [255, 255, 255],
      [0, 82, 165],
    ][band];
    for (let x = 0; x < width; x += 1) {
      pixels.set(color, (y * width + x) * 3);
    }
  }
  return pixels;
}

function rgbaPixels(rgb: Uint8Array): Uint8Array {
  const pixels = new Uint8Array((rgb.length / 3) * 4);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    pixels[j] = rgb[i];
    pixels[j + 1] = rgb[i + 1];
    pixels[j + 2] = rgb[i + 2];
    pixels[j + 3] = 255;
  }
  return pixels;
}

function decodeHemImage(pdf: string): Uint8Array {
  const image = pdf.slice(pdf.indexOf("/Subtype /Image"));
  const start = image.indexOf("stream\n") + "stream\n".length;
  const end = image.indexOf("\nendstream");
  return new Uint8Array(inflateSync(Buffer.from(image.slice(start, end), "latin1")));
}
