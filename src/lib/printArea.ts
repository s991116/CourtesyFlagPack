/** One decimal centimetre, without a trailing zero. */
export function formatCentimetres(cm: number): string {
  const rounded = Math.round(cm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Total printed page, width then height. */
export function printAreaLabel(widthMm: number, heightMm: number): string {
  return `Print area ${formatCentimetres(widthMm / 10)} × ${formatCentimetres(heightMm / 10)} cm`;
}

/** Saved PDF name. The full print area is included, and spaces are underscores. */
export function sheetFileName(widthMm: number, heightMm: number): string {
  const width = formatCentimetres(widthMm / 10);
  const height = formatCentimetres(heightMm / 10);
  return `courtesy-flags_print-area_${width}x${height}_cm.pdf`;
}
