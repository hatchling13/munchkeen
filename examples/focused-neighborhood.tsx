import { Graph, edgeId, nodeId, type GraphTheme, type GraphView } from "munchkeen";

const ada = nodeId("ada");
const charles = nodeId("charles");
const engine = nodeId("engine");
const notes = nodeId("notes");
const collaborates = edgeId("collaborates");
const designs = edgeId("designs");
const documents = edgeId("documents");

export const focusedNeighborhoodExampleGraph = {
  nodes: [
    { id: ada, kind: "person" as const, label: "Ada Lovelace" },
    { id: charles, kind: "person" as const, label: "Charles Babbage" },
    { id: engine, kind: "artifact" as const, label: "Analytical Engine" },
    { id: notes, kind: "document" as const, label: "Notes" },
  ],
  edges: [
    { id: collaborates, source: ada, target: charles, kind: "collaborates" as const },
    { id: designs, source: charles, target: engine, kind: "designs" as const, directed: true },
    { id: documents, source: ada, target: notes, kind: "documents" as const, directed: true },
  ],
};

export const focusedNeighborhoodExampleTheme = {
  nodes: {
    default: {
      color: "#8fb8ff",
    },
    byKind: {
      person: {
        color: "#0f766e",
      },
      artifact: {
        color: "#f59e0b",
      },
      document: {
        color: "#9333ea",
      },
    },
  },
  edges: {
    default: {
      color: "#64748b",
    },
  },
} satisfies GraphTheme<"person" | "artifact" | "document", "collaborates" | "designs" | "documents">;

export const focusedNeighborhoodExampleInitialView: GraphView = {
  focus: ada,
  neighborhood: {
    radius: 1,
    direction: "both",
  },
  selectedNodeIds: [ada],
};

export const FocusedNeighborhoodExample = () => (
  <Graph
    graph={focusedNeighborhoodExampleGraph}
    layout={{
      kind: "radial",
      root: ada,
      center: { x: 0, y: 0 },
    }}
    theme={focusedNeighborhoodExampleTheme}
    view={focusedNeighborhoodExampleInitialView}
  />
);
