import type { Flag, Region } from "../types/flag";

/** Flags whose name, code, labels, or region match the search, within a region. */
export function filterFlags(
  flags: readonly Flag[],
  query: string,
  region: Region | "all",
): Flag[] {
  const needle = query.trim().toLowerCase();
  return flags.filter((flag) => {
    if (region !== "all" && flag.region !== region) return false;
    if (!needle) return true;
    return (
      flag.hemLabel.toLowerCase().includes(needle) ||
      flag.iso.toLowerCase().includes(needle) ||
      flag.labels.some((label) => label.toLowerCase().includes(needle)) ||
      flag.region.toLowerCase().includes(needle)
    );
  });
}
