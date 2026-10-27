import { describe, expect, it } from "vitest";
import { flags } from "../data/flags";
import { maxFlagHeightCm, maxFlagLengthCm } from "../data/sheet";
import { regions } from "../types/flag";
import type { Flag } from "../types/flag";
import { filterFlags, flagKindLabel, flagKindLine } from "./catalog";
import { fittedFlagSize } from "./flagSize";

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

  it("lists quarantine, diver-down, and distress once under Special", () => {
    const quarantine = flags.filter((flag) => flag.hemLabel === "Quarantine Flag");
    expect(quarantine).toHaveLength(1);
    expect(quarantine[0]).toMatchObject({
      id: "q",
      kind: "special",
      ratio: { height: 30, length: 45 },
    });
    expect(filterFlags(flags, "", "all").map((flag) => flag.id)).toContain("q");
    expect(filterFlags(flags, "", "Europe").map((flag) => flag.id)).not.toContain("q");
    expect(filterFlags(flags, "", "all", "special").map((flag) => flag.id)).toEqual(
      flags.filter((flag) => flag.kind === "special").map((flag) => flag.id),
    );
    expect(filterFlags(flags, "quarantine", "all").map((flag) => flag.id)).toEqual(["q"]);
    expect(filterFlags(flags, "q-flag", "all").map((flag) => flag.id)).toEqual(["q"]);
    expect(flagKindLabel("special")).toBe("Special");
    expect(flagKindLine(quarantine[0])).toBe("Special - Q-flag");
    expect(flags.filter((flag) => flag.kind === "special").every((flag) => flag.detail)).toBe(
      true,
    );
    expect(filterFlags(flags, "special", "all").every((flag) => flag.kind === "special")).toBe(
      true,
    );
    const diver = flags.find((flag) => flag.id === "dive");
    const distress = flags.find((flag) => flag.id === "distress");
    expect(diver).toMatchObject({
      hemLabel: "Diver Down Flag",
      kind: "special",
      ratio: { height: 30, length: 45 },
    });
    expect(distress).toMatchObject({
      hemLabel: "Distress Signal Flag",
      kind: "special",
      ratio: { height: 30, length: 45 },
    });
    expect(flagKindLine(diver!)).toBe("Special - Dive-flag");
    expect(flagKindLine(distress!)).toBe("Special - Distress");
    expect(filterFlags(flags, "diver", "all").map((flag) => flag.id)).toEqual(["dive"]);
    expect(filterFlags(flags, "distress", "all").map((flag) => flag.id)).toEqual([
      "distress",
    ]);
    for (const flag of [quarantine[0], diver!, distress!]) {
      expect(fittedFlagSize(flag)).toEqual({
        lengthCm: maxFlagLengthCm,
        heightCm: maxFlagHeightCm,
      });
      expect(filterFlags(flags, "", "Europe").map((item) => item.id)).not.toContain(flag.id);
    }
  });

  it("sorts every flag by its title, mixing national, regional, and special", () => {
    const titles = flags.map((flag) => flag.hemLabel);
    expect(titles).toEqual(
      [...titles].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
    );
    const quarantine = flags.findIndex((flag) => flag.hemLabel === "Quarantine Flag");
    expect(flags[quarantine - 1]).toMatchObject({ hemLabel: "Qatar", kind: "national" });
    expect(flags[quarantine].kind).toBe("special");
    expect(flags.some((flag, index) => index > 0 && flag.kind !== flags[index - 1].kind)).toBe(
      true,
    );
  });

  it("starts every word in a title with a capital letter", () => {
    for (const flag of flags) {
      for (const word of flag.hemLabel.split(/\s+/)) {
        expect(word.charAt(0)).toBe(word.charAt(0).toLocaleUpperCase("en"));
      }
    }
    expect(flags.find((flag) => flag.id === "sig-z")?.hemLabel).toBe("Z Signal Flag");
  });

  it("lists signal flags A to Z with their ratios and the same special name", () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const signals = letters.map((letter) =>
      flags.find((flag) => flag.id === `sig-${letter.toLowerCase()}`),
    );
    for (const [index, flag] of signals.entries()) {
      const letter = letters[index];
      const swallowtail = letter === "A" || letter === "B";
      expect(flag).toMatchObject({
        hemLabel: `${letter} Signal Flag`,
        kind: "special",
        detail: "Signal Flag",
        ratio: swallowtail ? { height: 1, length: 1.5 } : { height: 1, length: 1 },
      });
      expect(flag?.shape).toBe(swallowtail ? "swallowtail" : undefined);
      expect(flagKindLine(flag!)).toBe("Special - Signal Flag");
      expect(filterFlags(flags, "", "Europe").map((item) => item.id)).not.toContain(flag!.id);
    }
    expect(fittedFlagSize(signals[0]!)).toEqual({
      lengthCm: maxFlagLengthCm,
      heightCm: maxFlagHeightCm,
    });
    expect(fittedFlagSize(signals[2]!)).toEqual({
      lengthCm: maxFlagHeightCm,
      heightCm: maxFlagHeightCm,
    });
    expect(filterFlags(flags, "bravo", "all").map((flag) => flag.id)).toEqual(["sig-b"]);
    expect(filterFlags(flags, "zulu", "all").map((flag) => flag.id)).toEqual(["sig-z"]);
  });
});