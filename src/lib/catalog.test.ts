import { describe, expect, it } from "vitest";
import { flags } from "../data/flags";
import { regions } from "../types/flag";
import type { Flag } from "../types/flag";
import { filterFlags } from "./catalog";

function sampleFlag(patch: Partial<Flag> & Pick<Flag, "id" | "hemLabel">): Flag {
  return {
    iso: patch.id,
    labels: [patch.hemLabel],
    ratio: { height: 2, length: 3 },
    asset: { svg: `/flags/${patch.id}.svg` },
    region: "Europe",
    kind: "national",
    ...patch,
  };
}

const sample: Flag[] = [
  sampleFlag({ id: "dk", hemLabel: "Denmark", region: "Europe" }),
  sampleFlag({ id: "se", hemLabel: "Sweden", region: "Europe" }),
  sampleFlag({ id: "bs", hemLabel: "Bahamas", region: "Caribbean" }),
  sampleFlag({
    id: "gb-sct",
    hemLabel: "Scotland",
    region: "Europe",
    kind: "regional",
  }),
];

describe("flag search", () => {
  it("returns every flag in a sailing area when the search is empty", () => {
    expect(filterFlags(sample, "  ", "Europe").map((flag) => flag.id)).toEqual([
      "dk",
      "se",
      "gb-sct",
    ]);
  });

  it("matches a country name, code, or area without case", () => {
    expect(filterFlags(sample, "bah", "all").map((flag) => flag.id)).toEqual([
      "bs",
    ]);
    expect(filterFlags(sample, "DK", "all").map((flag) => flag.id)).toEqual([
      "dk",
    ]);
    expect(filterFlags(sample, "caribbean", "all").map((flag) => flag.id)).toEqual([
      "bs",
    ]);
  });

  it("keeps the area limit even when the search matches another area", () => {
    expect(filterFlags(sample, "bahamas", "Europe")).toEqual([]);
  });

  it("matches an alternate name that is not the text printed in the hem", () => {
    const netherlands = sampleFlag({
      id: "nl",
      hemLabel: "Netherlands",
      labels: ["Netherlands", "Holland"],
    });
    expect(filterFlags([netherlands], "holland", "all").map((flag) => flag.id)).toEqual([
      "nl",
    ]);
  });

  it("separates national courtesy flags from optional regional flags", () => {
    expect(filterFlags(sample, "", "all", "regional").map((flag) => flag.id)).toEqual([
      "gb-sct",
    ]);
    expect(filterFlags(sample, "optional", "all").map((flag) => flag.id)).toEqual([
      "gb-sct",
    ]);
    expect(filterFlags(sample, "national", "Europe").map((flag) => flag.id)).toEqual([
      "dk",
      "se",
    ]);
    expect(filterFlags(sample, "al", "all").map((flag) => flag.id)).toEqual([]);
  });

  it("covers each sailing area with a national flag and unique artwork", () => {
    expect(new Set(flags.map((flag) => flag.id)).size).toBe(flags.length);
    for (const region of regions) {
      expect(flags.some((flag) => flag.region === region && flag.kind === "national")).toBe(
        true,
      );
    }
    expect(flags.find((flag) => flag.id === "gb-sct")?.kind).toBe("regional");
    expect(flags.find((flag) => flag.id === "gb")?.kind).toBe("national");
  });

  it("lists French and Dutch island flags as optional beside the national flag", () => {
    expect(flags.find((flag) => flag.id === "fr")?.kind).toBe("national");
    expect(flags.find((flag) => flag.id === "nl")?.kind).toBe("national");
    const french = filterFlags(flags, "france", "all");
    expect(french.map((flag) => flag.id)).toContain("fr");
    expect(french.map((flag) => flag.id)).toEqual(
      expect.arrayContaining(["gp", "mq", "pf", "re"]),
    );
    expect(french.filter((flag) => flag.id !== "fr").every((flag) => flag.kind === "regional")).toBe(
      true,
    );
    expect(
      filterFlags(flags, "dutch", "Caribbean")
        .map((flag) => flag.id)
        .sort(),
    ).toEqual(["aw", "bq", "bq-sa", "bq-se", "cw", "sx"]);
  });
});