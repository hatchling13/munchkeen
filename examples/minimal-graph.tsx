import { Graph, edgeId, nodeId, type GraphView } from "munchkeen";

const ada = nodeId("ada");
const charles = nodeId("charles");
const engine = nodeId("engine");
const collaborates = edgeId("collaborates");
const designs = edgeId("designs");

export const minimalGraphExampleGraph = {
  nodes: [
    { id: ada, label: "Ada Lovelace", kind: "person" as const },
    { id: charles, label: "Charles Babbage", kind: "person" as const },
    { id: engine, label: "Analytical Engine", kind: "artifact" as const },
  ],
  edges: [
    { id: collaborates, source: ada, target: charles, label: "collaborates" },
    {
      id: designs,
      source: charles,
      target: engine,
      label: "designs",
      directed: true,
    },
  ],
};

export const minimalGraphExampleInitialView: GraphView = {
  focus: ada,
  neighborhood: {
    radius: 1,
    direction: "both",
  },
};

export const MinimalGraphExample = () => (
  <Graph
    graph={minimalGraphExampleGraph}
    layout={{
      kind: "breadthfirst",
      root: ada,
    }}
    view={minimalGraphExampleInitialView}
  />
);
