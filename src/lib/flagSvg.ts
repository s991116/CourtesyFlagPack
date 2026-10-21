/**
 * Paint opacity on a clip path is not part of the picture.
 * svg2pdf otherwise leaves that opacity on and fades the flag.
 */
export function stripClipPaintOpacity(svgText: string): string {
  return svgText.replace(/<clipPath\b[^>]*>[\s\S]*?<\/clipPath>/gi, (clip) =>
    clip.replace(/\s(?:fill-opacity|opacity|stroke-opacity)="[^"]*"/g, ""),
  );
}
