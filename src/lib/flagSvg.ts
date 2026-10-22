/**
 * Paint opacity on a clip path is not part of the picture.
 * svg2pdf otherwise leaves that opacity on and fades the flag.
 */
export function stripClipPaintOpacity(svgText: string): string {
  return svgText.replace(/<clipPath\b[^>]*>[\s\S]*?<\/clipPath>/gi, (clip) =>
    clip.replace(/\s(?:fill-opacity|opacity|stroke-opacity)="[^"]*"/g, ""),
  );
}

/** Draw the 4×3 file across the finished flag, including the mirrored hem. */
export function stretchFlagArtwork(svgText: string): string {
  return svgText.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\spreserveAspectRatio="[^"]*"/g, "");
    return `<svg${cleaned} preserveAspectRatio="none">`;
  });
}
