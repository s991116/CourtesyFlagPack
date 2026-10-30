import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  clipAndFlipSvg,
  flagNeedsRaster,
  inlineSvgUses,
  stretchFlagArtwork,
  stripClipPaintOpacity,
  svgViewBox,
} from "./flagSvg";

const flagsDir = join(dirname(fileURLToPath(import.meta.url)), "../../public/flags");

const iceland = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <defs>
    <clipPath id="is-a">
      <path fill-opacity=".7" d="M0 0h640v480H0z"/>
    </clipPath>
  </defs>
  <g clip-path="url(#is-a)">
    <path fill="#003897" d="M0 0h666.7v480H0z"/>
    <path fill="#fff" d="M0 186.7h186.7V0h106.6v186.7h373.4v106.6H293.3V480H186.7V293.3H0z"/>
    <path fill="#d72828" d="M0 213.3h213.3V0h53.4v213.3h400v53.4h-400V480h-53.4V266.7H0z"/>
  </g>
</svg>`;

describe("flag svg for print", () => {
  it("drops the clip opacity that washes out the Icelandic flag", () => {
    const prepared = stripClipPaintOpacity(iceland);

    expect(prepared).not.toContain("fill-opacity");
    expect(prepared).toContain('fill="#003897"');
    expect(prepared).toContain('fill="#d72828"');
    expect(prepared).toContain('clip-path="url(#is-a)"');
  });

  it("stretches the artwork to the finished flag", () => {
    const prepared = stretchFlagArtwork(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid meet">`,
    );
    expect(prepared).toContain('preserveAspectRatio="none"');
    expect(prepared).not.toContain("xMidYMid");
  });

  it("keeps a flat flag as vectors and rasters paint that is not flat", () => {
    expect(flagNeedsRaster(iceland)).toBe(false);
    expect(flagNeedsRaster(`<svg xmlns="http://www.w3.org/2000/svg"><path fill="#c8102e" d="M0 0h1v1H0z"/></svg>`)).toBe(false);
    expect(flagNeedsRaster(`<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="a"/><path fill="url(#a)" d="M0 0h1v1H0z"/></svg>`)).toBe(true);
    expect(flagNeedsRaster(`<svg xmlns="http://www.w3.org/2000/svg"><path stroke-opacity=".5" d="M0 0h1v1H0z"/></svg>`)).toBe(true);
    expect(flagNeedsRaster(`<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,xx"/></svg>`)).toBe(true);
  });

  it("clips the mirrored picture to the hem slice", () => {
    const view = svgViewBox(iceland);
    expect(view).toEqual({ x: 0, y: 0, width: 640, height: 480 });
    const clipped = clipAndFlipSvg(
      iceland,
      { x: 0, y: 400, width: 640, height: 80 },
      "translate(0 480) scale(1 -1)",
    );
    expect(clipped).toContain('id="print-hem"');
    expect(clipped).toContain('clip-path="url(#print-hem)"');
    expect(clipped).toContain('transform="translate(0 480) scale(1 -1)"');
    expect(clipped).toContain('fill="#003897"');
    expect(clipped.endsWith("</g></g></svg>")).toBe(true);
  });

  it("leaves a flag without clip opacity unchanged", () => {
    const denmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <path fill="#c8102e" d="M0 0h640.1v480H0z"/>
      <path fill="#fff" d="M205.7 0h68.6v480h-68.6z"/>
    </svg>`;
    expect(stripClipPaintOpacity(denmark)).toBe(denmark);
  });
});

describe("flag references for print", () => {
  it("places a reused shape with its shift after its rotation", () => {
    const prepared = inlineSvgUses(`<svg xmlns="http://www.w3.org/2000/svg">
      <path id="p" d="M0 0h1v1H0z"/>
      <use xlink:href="#p" x="10" y="20" transform="rotate(45)" fill="#fff"/>
    </svg>`);

    expect(prepared).not.toContain("<use");
    expect(prepared).toContain('transform="rotate(45) translate(10,20)" fill="#fff"');
    expect(prepared.split('d="M0 0h1v1H0z"').length - 1).toBe(2);
    expect(prepared.split('id="p"').length - 1).toBe(1);
  });

  it("copies a shape that is defined after the reference", () => {
    const prepared = inlineSvgUses(`<svg xmlns="http://www.w3.org/2000/svg">
      <use href="#p" y="5"/>
      <path id="p" d="M0,0h1"/>
    </svg>`);

    expect(prepared).toContain('transform="translate(0,5)"');
    expect(prepared).toContain('<path d="M0,0h1"/>');
    expect(prepared).not.toContain("<use");
  });

  it("draws every United States star", () => {
    const prepared = inlineSvgUses(readFileSync(join(flagsDir, "us.svg"), "utf8"));
    const star =
      'd="M247,90 317.534230,307.082039 132.873218,172.917961H361.126782L176.465770,307.082039z"';

    expect(prepared).not.toMatch(/<use\b/);
    expect(prepared.split(star).length - 1).toBe(50);
    expect(prepared).toContain("translate(0,420)");
    expect(prepared).toContain("translate(0,840)");
    expect(prepared).toContain("translate(0,1260)");
    expect(prepared).toContain("translate(0,1680)");
    expect(prepared).toContain("translate(247,210)");
  });

  it("draws every point of the Saba star", () => {
    const prepared = inlineSvgUses(readFileSync(join(flagsDir, "bq-sa.svg"), "utf8"));

    expect(prepared).not.toMatch(/<use\b/);
    expect(prepared.split('d="M0,-283V0H142z"').length - 1).toBe(10);
    expect(prepared).toContain('transform="scale(-1,1)"');
    expect(prepared).toContain('transform="rotate(72)"');
    expect(prepared).toContain('transform="rotate(-72)"');
    expect(prepared).toContain('transform="rotate(144)"');
  });

  it("leaves a flag without references unchanged", () => {
    const denmark = readFileSync(join(flagsDir, "dk.svg"), "utf8");
    expect(inlineSvgUses(denmark)).toBe(denmark);
  });

  it("expands every flag that reuses a shape", () => {
    const files = readdirSync(flagsDir).filter((name) => name.endsWith(".svg"));
    expect(files.length).toBeGreaterThan(50);
    for (const name of files) {
      let prepared = "";
      try {
        prepared = inlineSvgUses(readFileSync(join(flagsDir, name), "utf8"));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${name}: ${message}`);
      }
      if (/<use\b/i.test(prepared)) throw new Error(`${name} still has a reference`);
      if (!prepared.includes("<svg")) throw new Error(`${name} lost its root`);
    }
  });
});
