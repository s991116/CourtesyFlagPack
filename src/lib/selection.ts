import { sheetCapacity } from "./layout";

export function isSheetFull(selectedCount: number, capacity: number): boolean {
  return selectedCount >= capacity;
}

/**
 * Add a flag at the end, or remove it if it is already selected.
 * A full sheet accepts no further flags.
 */
export function toggleSelection(
  selectedIds: readonly string[],
  id: string,
  columns: number,
  rows: number,
): string[] {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((item) => item !== id);
  }
  if (isSheetFull(selectedIds.length, sheetCapacity(columns, rows))) {
    return [...selectedIds];
  }
  return [...selectedIds, id];
}

/** Drop flags that no longer fit, keeping the earlier choices. */
export function trimSelection(
  selectedIds: readonly string[],
  columns: number,
  rows: number,
): string[] {
  return selectedIds.slice(0, sheetCapacity(columns, rows));
}

export function removeSelection(
  selectedIds: readonly string[],
  id: string,
): string[] {
  return selectedIds.filter((item) => item !== id);
}
