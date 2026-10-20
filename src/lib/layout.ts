/** Split a selection into pages of `columns * rows` flags. */
export function paginateFlags(
  ids: readonly string[],
  columns: number,
  rows: number,
): string[][] {
  const pageSize = columns * rows;
  if (pageSize <= 0 || ids.length === 0) return [];

  const pages: string[][] = [];
  for (let index = 0; index < ids.length; index += pageSize) {
    pages.push(ids.slice(index, index + pageSize));
  }
  return pages;
}
