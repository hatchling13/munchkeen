import { isServer } from "solid-js/web";
import { describe, expect, it } from "vitest";

import { Graph } from "../src";

describe("environment", () => {
  it("runs on client", () => {
    expect(typeof window).toBe("object");
    expect(isServer).toBe(false);
  });
});

describe("package surface", () => {
  it("exports the Graph component scaffold", () => {
    expect(typeof Graph).toBe("function");
  });
});
