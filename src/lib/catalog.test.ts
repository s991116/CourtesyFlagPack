import { describe, expect, it } from "vitest";
import { flags } from "../data/flags";
import type { Flag } from "../types/flag";
import { filterFlags } from "./catalog";

const sample: Flag[] = [
  flags.find((flag) => flag.id === "dk")!,
  flags.find((flag) => flag.id === "se")!,
  flags.find((flag) => flag.id === "gb")!,
  flags.find((flag) => flag.id === "fr")!,
];

describe("flag search", () => {
  it("returns every flag in a region when the search is empty", () => {
    expect(filterFlags(sample, "  ", "Nordic").map((flag) => flag.id)).toEqual([
      "dk",
      "se",
    ]);
  });

  it("matches a country name, code, or region without case", () => {
    expect(filterFlags(sample, "king", "all").map((flag) => flag.id)).toEqual([
      "gb",
    ]);
    expect(filterFlags(sample, "FR", "all").map((flag) => flag.id)).toEqual([
      "fr",
    ]);
    expect(filterFlags(sample, "nordic", "all").map((flag) => flag.id)).toEqual([
      "dk",
      "se",
    ]);
  });

  it("keeps the region limit even when the search matches another region", () => {
    expect(filterFlags(sample, "france", "Nordic")).toEqual([]);
  });
});
