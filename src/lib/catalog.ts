import type { Flag, FlagKind, Region } from "../types/flag";

/** Flags whose name, code, labels, area, or kind match the search. */
export function filterFlags(
  flags: readonly Flag[],
  query: string,
  region: Region | "all",
  kind: FlagKind | "all" = "all",
): Flag[] {
  const needle = query.trim().toLowerCase();
  return flags.filter((flag) => {
    if (region !== "all" && flag.region !== region) return false;
    if (kind !== "all" && flag.kind !== kind) return false;
    if (!needle) return true;
    const kindWords =
      flag.kind === "regional" ? ["regional", "optional"] : ["national"];
    return (
      flag.hemLabel.toLowerCase().includes(needle) ||
      flag.iso.toLowerCase().includes(needle) ||
      flag.labels.some((label) => label.toLowerCase().includes(needle)) ||
      flag.region.toLowerCase().includes(needle) ||
      kindWords.some((word) => needle.length >= 4 && word.startsWith(needle))
    );
  });
}

export function flagKindLabel(kind: FlagKind): string {
  return kind === "regional" ? "Regional · optional" : "National";
}
