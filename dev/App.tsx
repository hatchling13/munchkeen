import { createSignal, type Component } from "solid-js";

import {
  Graph,
  edgeId,
  nodeId,
  type GraphTheme,
  type GraphView,
} from "src";

import styles from "./App.module.css";

const ada = nodeId("ada");
const charles = nodeId("charles");
const engine = nodeId("engine");
const notes = nodeId("notes");
const collaborates = edgeId("collaborates");
const designs = edgeId("designs");
const documents = edgeId("documents");

const graph = {
  nodes: [
    { id: ada, kind: "person" as const, label: "Ada Lovelace" },
    { id: charles, kind: "person" as const, label: "Charles Babbage" },
    { id: engine, kind: "artifact" as const, label: "Analytical Engine" },
    { id: notes, kind: "document" as const, label: "Notes" },
  ],
  edges: [
    { id: collaborates, source: ada, target: charles, kind: "collaborates" as const, label: "collaborates" },
    { id: designs, source: charles, target: engine, kind: "designs" as const, label: "designs", directed: true },
    { id: documents, source: ada, target: notes, kind: "documents" as const, label: "documents", directed: true },
  ],
};

const layout = {
  kind: "preset" as const,
  positions: new Map([
    [ada, { x: 100, y: 110 }],
    [charles, { x: 300, y: 90 }],
    [engine, { x: 520, y: 150 }],
    [notes, { x: 240, y: 300 }],
  ]),
};

const theme = {
  nodes: {
    default: {
      className: "mk-node",
      color: "#8fb8ff",
    },
    byKind: {
      person: {
        className: "mk-person",
        color: "#0f766e",
      },
      artifact: {
        className: "mk-artifact",
        color: "#f59e0b",
      },
      document: {
        className: "mk-document",
        color: "#9333ea",
      },
    },
  },
  edges: {
    default: {
      className: "mk-edge",
      color: "#64748b",
    },
    byKind: {
      collaborates: {
        className: "mk-collaborates",
      },
      designs: {
        className: "mk-designs",
      },
      documents: {
        className: "mk-documents",
      },
    },
  },
} satisfies GraphTheme<"person" | "artifact" | "document", "collaborates" | "designs" | "documents">;

const initialView: GraphView = {
  focus: ada,
  selectedNodeIds: [ada],
  selectedEdgeIds: [],
};

const App: Component = () => {
  const [view, setView] = createSignal<GraphView>(initialView);

  return (
    <main class={styles.appShell}>
      <section class={styles.panel}>
        <header class={styles.header}>
          <p class={styles.kicker}>munchkeen</p>
          <h1 class={styles.title}>Step 10 Solid integration</h1>
          <p class={styles.copy}>
            Click a node to move focus. Selection remains controlled by the app state that the
            `Graph` component emits back through callbacks.
          </p>
        </header>
        <div class={styles.summary}>
          <div>
            <span class={styles.label}>Focused node</span>
            <strong>{view().focus ?? "none"}</strong>
          </div>
          <div>
            <span class={styles.label}>Selected nodes</span>
            <strong>{view().selectedNodeIds?.join(", ") ?? "none"}</strong>
          </div>
          <div>
            <span class={styles.label}>Selected edges</span>
            <strong>{view().selectedEdgeIds?.join(", ") ?? "none"}</strong>
          </div>
        </div>
        <div class={styles.stage}>
          <Graph
            class={styles.graph}
            fallback={<div class={styles.fallback}>The graph could not be rendered.</div>}
            graph={graph}
            layout={layout}
            theme={theme}
            view={view()}
            onNodeActivate={(node) => {
              setView((current) => ({
                ...current,
                focus: node.id,
                selectedNodeIds: [node.id],
              }));
            }}
            onSelectionChange={(selection) => {
              setView((current) => ({
                ...current,
                selectedNodeIds: selection.nodeIds,
                selectedEdgeIds: selection.edgeIds,
              }));
            }}
          />
        </div>
      </section>
    </main>
  );
};

export default App;
