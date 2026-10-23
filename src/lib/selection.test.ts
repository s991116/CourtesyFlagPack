import { describe, expect, it } from "vitest";
import { isSheetFull, removeSelection, toggleSelection, trimSelection } from "./selection";

describe("sheet selection", () => {
  it("adds flags in the order they are chosen", () => {
    const first = toggleSelection([], "dk", 2, 2);
    const second = toggleSelection(first, "se", 2, 2);
    expect(second).toEqual(["dk", "se"]);
  });

  it("removes a flag that is chosen again", () => {
    expect(toggleSelection(["dk", "se"], "dk", 2, 2)).toEqual(["se"]);
  });

  it("accepts the next flag when another row is opened", () => {
    const selected = ["dk", "se", "no", "fi"];
    const columns = 4;
    const rows = Math.ceil((selected.length + 1) / columns);
    expect(toggleSelection(selected, "is", columns, rows)).toEqual([
      "dk",
      "se",
      "no",
      "fi",
      "is",
    ]);
  });

  it("refuses another flag when every slot is taken", () => {
    const full = ["dk", "se", "no", "fi"];
    expect(toggleSelection(full, "is", 2, 2)).toEqual(full);
    expect(isSheetFull(full.length, 4)).toBe(true);
  });

  it("allows a new flag after one is removed from a full sheet", () => {
    const afterRemoval = removeSelection(["dk", "se", "no", "fi"], "se");
    expect(afterRemoval).toEqual(["dk", "no", "fi"]);
    expect(toggleSelection(afterRemoval, "is", 2, 2)).toEqual([
      "dk",
      "no",
      "fi",
      "is",
    ]);
  });

  it("keeps the earliest flags when the sheet gets smaller", () => {
    const selected = ["dk", "se", "no", "fi", "is", "ee"];
    expect(trimSelection(selected, 2, 2)).toEqual(["dk", "se", "no", "fi"]);
  });

  it("leaves a selection unchanged when it already fits", () => {
    expect(trimSelection(["dk", "se"], 4, 5)).toEqual(["dk", "se"]);
  });

  it("treats a sheet with no columns or rows as having no room", () => {
    expect(toggleSelection([], "dk", 0, 5)).toEqual([]);
    expect(isSheetFull(0, 0)).toBe(true);
  });
});
