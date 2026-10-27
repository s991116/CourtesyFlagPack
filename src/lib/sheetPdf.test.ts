import { deflateSync, inflateSync } from "node:zlib";
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
  it("stores the same pixels in a much smaller Flate stream", () => {
    const width = 900;
    const height = 80;
    const pixels = stripePixels(width, height);
    const doc = new jsPDF({ unit: "mm", format: [200, 100] });
    addHemImage(doc, pngDataUrl(width, height, pixels), 0, 0, 90, 12);
    const raw = new jsPDF({ unit: "mm", format: [200, 100] });
    raw.addImage(pngDataUrl(width, height, pixels), "PNG", 0, 0, 90, 12);

    const output = doc.output();
    const image = output.slice(output.indexOf("/Subtype /Image"));
    expect(image).toContain("/Filter /FlateDecode");
    expect(image).toContain("/ColorSpace /DeviceRGB");
    expect(image).not.toContain("/SMask");
    expect(doc.output("arraybuffer").byteLength).toBeLessThan(
      raw.output("arraybuffer").byteLength / 5,
    );
    expect(decodeHemImage(output, width, height)).toEqual(pixels);
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

function pngDataUrl(width: number, height: number, rgb: Uint8Array): string {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 3;
      const to = row + 1 + x * 4;
      raw[to] = rgb[from];
      raw[to + 1] = rgb[from + 1];
      raw[to + 2] = rgb[from + 2];
      raw[to + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(pngCrc(body));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, body, crc]);
}

function pngCrc(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function decodeHemImage(pdf: string, width: number, height: number): Uint8Array {
  const image = pdf.slice(pdf.indexOf("/Subtype /Image"));
  const start = image.indexOf("stream\n") + "stream\n".length;
  const end = image.indexOf("\nendstream");
  const packed = inflateSync(Buffer.from(image.slice(start, end), "latin1"));
  const colors = 3;
  const stride = width * colors;
  const pixels = new Uint8Array(height * stride);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const row = packed.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const decoded = new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const left = i >= colors ? decoded[i - colors] : 0;
      const up = previous[i];
      const upLeft = i >= colors ? previous[i - colors] : 0;
      decoded[i] = (row[i] + paeth(left, up, upLeft)) & 255;
    }
    pixels.set(decoded, y * stride);
    previous = decoded;
  }
  return pixels;
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const towardLeft = Math.abs(estimate - left);
  const towardUp = Math.abs(estimate - up);
  const towardUpLeft = Math.abs(estimate - upLeft);
  if (towardLeft <= towardUp && towardLeft <= towardUpLeft) return left;
  if (towardUp <= towardUpLeft) return up;
  return upLeft;
}
