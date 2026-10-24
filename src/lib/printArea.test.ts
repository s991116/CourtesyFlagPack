import { describe, expect, it } from "vitest";
import { printLayout } from "../config/print";
import { flagClothById } from "../data/sheet";
import type { Flag } from "../types/flag";
import { printAreaLabel, formatCentimetres, sheetFileName } from "./printArea";
import { buildSheetGeometry } from "./sheetGeometry";

function flag(id: string): Flag {
  return {
    id,
    iso: id,
    labels: [id],
    hemLabel: id,
    ratio: { height: 2, length: 3 },
    asset: { svg: `/flags/${id}.svg` },
    region: "Europe",
    kind: "national",
  };
}

describe("print area", () => {
  const cloth = flagClothById("45x30");
  const flags = ["a", "b", "c", "d", "e"].map(flag);

  it("states one 45 by 30 cm flag as the full printed page", () => {
    const sheet = buildSheetGeometry([flags[0]], 4, 1, printLayout, cloth, "stretched");
    expect(printAreaLabel(sheet.pageWidthMm, sheet.pageHeightMm)).toBe(
      "Print area 50.6 × 35.6 cm",
    );
  });

  it("grows when a new row opens, the row count changes, or the cloth changes", () => {
    const oneRow = buildSheetGeometry(flags.slice(0, 4), 4, 1, printLayout, cloth, "stretched");
    const twoRows = buildSheetGeometry(flags, 4, 2, printLayout, cloth, "stretched");
    const twoPerRow = buildSheetGeometry(flags, 2, 3, printLayout, cloth, "stretched");
    const smaller = buildSheetGeometry(
      [flags[0]],
      4,
      1,
      printLayout,
      flagClothById("30x20"),
      "stretched",
    );

    expect(twoRows.pageWidthMm).toBeCloseTo(oneRow.pageWidthMm);
    expect(twoRows.pageHeightMm).toBeGreaterThan(oneRow.pageHeightMm);
    expect(twoPerRow.pageWidthMm).toBeLessThan(oneRow.pageWidthMm);
    expect(twoPerRow.pageHeightMm).toBeGreaterThan(oneRow.pageHeightMm);
    expect(smaller.pageWidthMm).toBeLessThan(oneRow.pageWidthMm);
    expect(smaller.pageHeightMm).toBeLessThan(oneRow.pageHeightMm);
  });

  it("names the file with the print area and no spaces", () => {
    const sheet = buildSheetGeometry([flags[0]], 4, 1, printLayout, cloth, "stretched");
    expect(sheetFileName(sheet.pageWidthMm, sheet.pageHeightMm)).toBe(
      "courtesy-flags_print-area_50.6x35.6_cm.pdf",
    );
    expect(sheetFileName(sheet.pageWidthMm, sheet.pageHeightMm)).not.toMatch(/\s/);
  });

  it("keeps the file name in step with a new row, a narrower row, and a smaller cloth", () => {
    const sheets = [
      buildSheetGeometry(flags.slice(0, 4), 4, 1, printLayout, cloth, "stretched"),
      buildSheetGeometry(flags, 4, 2, printLayout, cloth, "stretched"),
      buildSheetGeometry(flags, 2, 3, printLayout, cloth, "stretched"),
      buildSheetGeometry([flags[0]], 4, 1, printLayout, flagClothById("30x20"), "stretched"),
    ];
    const names = sheets.map((sheet) => sheetFileName(sheet.pageWidthMm, sheet.pageHeightMm));

    expect(new Set(names).size).toBe(names.length);
    for (const sheet of sheets) {
      const width = formatCentimetres(sheet.pageWidthMm / 10);
      const height = formatCentimetres(sheet.pageHeightMm / 10);
      expect(printAreaLabel(sheet.pageWidthMm, sheet.pageHeightMm)).toBe(
        `Print area ${width} × ${height} cm`,
      );
      expect(sheetFileName(sheet.pageWidthMm, sheet.pageHeightMm)).toBe(
        `courtesy-flags_print-area_${width}x${height}_cm.pdf`,
      );
    }
  });
});
