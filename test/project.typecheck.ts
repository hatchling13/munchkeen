import type { ProjectedGraph } from "../src/core/project";

// @ts-expect-error projected graphs must come from projectGraph rather than manual construction.
const invalidProjectedGraph: ProjectedGraph = {
  _tag: "ProjectedGraph",
  nodes: [],
  edges: [],
  nodeIds: [],
  edgeIds: [],
  nodeById: new Map(),
  edgeById: new Map(),
};

void invalidProjectedGraph;
