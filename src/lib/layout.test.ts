import { describe, expect, it } from "vitest";
import { paginateFlags, sheetCapacity } from "./layout";

describe("sheet capacity", () => {
  it("counts the slots in the grid", () => {
    expect(sheetCapacity(2, 2)).toBe(4);
    expect(sheetCapacity(3, 4)).toBe(12);
    expect(sheetCapacity(4, 5)).toBe(20);
  });

  it("has no slots when a side is missing", () => {
    expect(sheetCapacity(0, 4)).toBe(0);
    expect(sheetCapacity(4, -1)).toBe(0);
  });
});

describe("placing flags on pages", () => {
  it("returns no pages for an empty selection", () => {
    expect(paginateFlags([], 4, 5)).toEqual([]);
  });

  it("keeps one page when the selection fits", () => {
    expect(paginateFlags(["dk", "se"], 2, 2)).toEqual([["dk", "se"]]);
  });

  it("fills a page before starting the next", () => {
    expect(paginateFlags(["dk", "se", "no", "fi", "is"], 2, 2)).toEqual([
      ["dk", "se", "no", "fi"],
      ["is"],
    ]);
  });
});
