import { isServer } from "solid-js/web";
import { describe, expect, it } from "vitest";

import { Graph } from "../src";
import * as core from "../src/core";
import * as cytoscape from "../src/cytoscape";

describe("environment", () => {
  it("runs on client", () => {
    expect(typeof window).toBe("object");
    expect(isServer).toBe(false);
  });
});

describe("package surface", () => {
  it("exports the Graph component", () => {
    expect(typeof Graph).toBe("function");
  });

  it("exports core and Cytoscape companion entrypoints", () => {
    expect(typeof core.validateGraph).toBe("function");
    expect(typeof core.buildRenderScene).toBe("function");
    expect(typeof cytoscape.createCytoscapeRenderer).toBe("function");
  });
});
