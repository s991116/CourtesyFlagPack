// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { Flag } from "../types/flag";
import { createSheetDocument, embedFlagArtwork } from "./sheetPdf";
import { buildSheetGeometry } from "./sheetGeometry";

const denmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <path fill="#c8102e" d="M0 0h640v480H0z"/>
  <path fill="#fff" d="M205.7 0h68.6v480h-68.6z"/>
  <path fill="#fff" d="M0 205.7h640v68.6H0z"/>
</svg>`;

function flag(): Flag {
  return {
    id: "dk",
    iso: "dk",
    labels: ["Denmark"],
    hemLabel: "Denmark",
    ratio: { height: 2, length: 3 },
    asset: { svg: "/flags/dk.svg" },
    region: "Europe",
    kind: "national",
  };
}

describe("print sheet colours", () => {
  it("paints a flat flag in CMYK vectors, with no RGB image", async () => {
    const geometry = buildSheetGeometry([flag()], 2, 1);
    const doc = createSheetDocument(geometry);
    await embedFlagArtwork(doc, geometry, new Map([["dk", denmark]]));

    const output = doc.output();
    const paint = output.slice(output.indexOf("stream\n"), output.indexOf("endstream"));
    expect(output).not.toContain("/DeviceRGB");
    expect(output).not.toContain("/Subtype /Image");
    expect(paint).not.toMatch(/\brg\b/);
    expect(paint).not.toMatch(/\bRG\b/);
    expect(paint).not.toMatch(/\bg\b/);
    expect(paint).not.toMatch(/\bG\b/);
    expect(paint).toMatch(/0\. 0\.92 0\.77 0\.22 k/);
    // Eight hem slices, each clipped again inside the mirrored flag, plus the flag.
    expect(paint.match(/\nW\n/g)?.length).toBe(17);
  });
});
