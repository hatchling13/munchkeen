import type { LayoutSpec } from "../src";
import type { LaidOutGraph } from "../src/core/layout";

const validBreadthfirstLayout: LayoutSpec = {
  kind: "breadthfirst",
};

void validBreadthfirstLayout;

const invalidRendererNativeLayout: LayoutSpec = {
  // @ts-expect-error renderer-native layouts stay adapter-local rather than entering the core LayoutSpec.
  kind: "dagre",
};

void invalidRendererNativeLayout;

// @ts-expect-error preset layout requires explicit positions for projected nodes.
const invalidPresetLayout: LayoutSpec = {
  kind: "preset",
};

void invalidPresetLayout;

// @ts-expect-error laid out graphs must come from runLayout rather than manual construction.
const invalidLaidOutGraph: LaidOutGraph = {
  _tag: "LaidOutGraph",
  nodes: [],
  edges: [],
  nodeIds: [],
  edgeIds: [],
  nodeById: new Map(),
  edgeById: new Map(),
  positions: new Map(),
};

void invalidLaidOutGraph;
