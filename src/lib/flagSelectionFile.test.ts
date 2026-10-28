import { describe, expect, it } from "vitest";
import { formatFlagSelection, parseFlagSelection } from "./flagSelectionFile";

describe("flag selection file", () => {
  it("saves the size, the ratio, and each flag id", () => {
    const text = formatFlagSelection({
      clothId: "30x20",
      fit: "max",
      columns: 3,
      flagIds: ["dk", "us"],
    });

    expect(text).toBe(
      ["# Courtesy flags", "size: 30x20", "ratio: original", "flags per row: 3", "dk", "us", ""].join(
        "\n",
      ),
    );
  });

  it("loads the sheet and keeps the flag order", () => {
    const parsed = parseFlagSelection(
      ["size: 45x30", "ratio: stretched", "flags per row: 5", "us", "dk"].join("\n"),
    );

    expect(parsed).toEqual({
      clothId: "45x30",
      fit: "stretched",
      columns: 5,
      flagIds: ["us", "dk"],
      unknown: [],
    });
  });

  it("accepts a flag name and ignores a repeated id", () => {
    const parsed = parseFlagSelection("Denmark\nDK\nUnited States\n");

    expect(parsed.flagIds).toEqual(["dk", "us"]);
    expect(parsed.clothId).toBe("45x30");
    expect(parsed.fit).toBe("stretched");
    expect(parsed.columns).toBe(4);
  });

  it("lists flags that are not in the catalog", () => {
    const parsed = parseFlagSelection("dk\nNot A Flag\n");

    expect(parsed.flagIds).toEqual(["dk"]);
    expect(parsed.unknown).toEqual(["Not A Flag"]);
  });

  it("rejects a size or ratio the sheet does not offer", () => {
    expect(() => parseFlagSelection("size: 10x10\ndk\n")).toThrow(
      "The file could not be read.",
    );
    expect(() => parseFlagSelection("ratio: square\ndk\n")).toThrow(
      "The file could not be read.",
    );
  });

  it("rejects an empty file", () => {
    expect(() => parseFlagSelection("\n# only a comment\n")).toThrow(
      "The file could not be read.",
    );
  });
});
