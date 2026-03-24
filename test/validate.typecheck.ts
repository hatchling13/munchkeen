import type { ValidatedGraph } from "../src/core/validate";

// @ts-expect-error validated graphs must come from validateGraph rather than manual construction.
const invalidValidatedGraph: ValidatedGraph = {
  _tag: "ValidatedGraph",
  nodes: [],
  edges: [],
  nodeIds: [],
  edgeIds: [],
  nodeById: new Map(),
  edgeById: new Map(),
  adjacencyByNodeId: new Map(),
};

void invalidValidatedGraph;
