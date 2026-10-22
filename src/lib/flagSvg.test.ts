import { describe, expect, it } from "vitest";
import { stretchFlagArtwork, stripClipPaintOpacity } from "./flagSvg";

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

  it("leaves a flag without clip opacity unchanged", () => {
    const denmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <path fill="#c8102e" d="M0 0h640.1v480H0z"/>
      <path fill="#fff" d="M205.7 0h68.6v480h-68.6z"/>
    </svg>`;
    expect(stripClipPaintOpacity(denmark)).toBe(denmark);
  });
});
