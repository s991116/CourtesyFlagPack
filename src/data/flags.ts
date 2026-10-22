import type { Flag } from "../types/flag";
import { flagEntries } from "./flagEntries";

/**
 * Courtesy-flag catalog.
 * Artwork is stored under public/flags. See public/flags/LICENSE.txt.
 */
export const flags: readonly Flag[] = flagEntries.map((entry) => {
  const [height, length] = entry.ratio ?? [2, 3];
  return {
    id: entry.id,
    iso: entry.id,
    labels: [entry.name, ...(entry.labels ?? [])],
    hemLabel: entry.name,
    ratio: { height, length },
    asset: { svg: `/flags/${entry.id}.svg` },
    region: entry.region,
    kind: entry.kind ?? "national",
  };
});

const byId = new Map(flags.map((flag) => [flag.id, flag]));

export function flagById(id: string): Flag | undefined {
  return byId.get(id);
}
