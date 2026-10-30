import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { rgbToCmyk, useCmykColors } from "./cmyk";

describe("sRGB to CMYK", () => {
  it("turns white into no ink and black into black ink", () => {
    expect(rgbToCmyk(255, 255, 255)).toEqual([0, 0, 0, 0]);
    expect(rgbToCmyk(0, 0, 0)).toEqual([0, 0, 0, 1]);
  });

  it("keeps a pure red out of the cyan and black", () => {
    const [c, m, y, k] = rgbToCmyk(255, 0, 0);
    expect(c).toBe(0);
    expect(k).toBe(0);
    expect(m).toBeCloseTo(1);
    expect(y).toBeCloseTo(1);
  });

  it("writes svg colours as CMYK operators", () => {
    const doc = new jsPDF({ unit: "mm", format: [40, 40] });
    useCmykColors(doc);
    doc.setFillColor(200, 16, 46);
    doc.setDrawColor(0);
    doc.rect(0, 0, 10, 10, "FD");

    const output = doc.output();
    expect(output).not.toMatch(/\brg\b/);
    expect(output).not.toMatch(/\bRG\b/);
    expect(output).toMatch(/0\. 0\.92 0\.77 0\.22 k/);
    expect(output).toMatch(/0\. 0\. 0\. 1\. K/);
  });
});
