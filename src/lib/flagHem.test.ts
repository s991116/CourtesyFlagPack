import { describe, expect, it } from "vitest";
import { svgForHemRaster } from "./flagHem";

describe("hem raster", () => {
  it("stretches a 4×3 file to the finished flag instead of leaving side bars", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">
      <path fill="red" d="M0 0h640v480H0z"/>
    </svg>`;

    const sized = svgForHemRaster(svg, 1400, 1000);

    expect(sized).toContain('width="1400"');
    expect(sized).toContain('height="1000"');
    expect(sized).toContain('preserveAspectRatio="none"');
    expect(sized).not.toContain('width="640"');
    expect(sized).not.toContain('height="480"');
  });
});