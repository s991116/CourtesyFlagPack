import { describe, expect, it } from "vitest";
import { goatcounterEndpoint } from "./analytics";

describe("visit counter", () => {
  it("builds the counter address from a site code", () => {
    expect(goatcounterEndpoint("courtesyflagpack")).toBe(
      "https://courtesyflagpack.goatcounter.com/count",
    );
  });

  it("ignores a missing or unsafe site code", () => {
    expect(goatcounterEndpoint(undefined)).toBeNull();
    expect(goatcounterEndpoint("")).toBeNull();
    expect(goatcounterEndpoint("https://evil.example/count")).toBeNull();
    expect(goatcounterEndpoint("../other")).toBeNull();
  });
});
