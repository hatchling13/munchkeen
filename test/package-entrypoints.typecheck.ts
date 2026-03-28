import {
  Graph,
  type GraphRenderer,
  type GraphSelection,
} from "munchkeen";
import {
  buildRenderScene,
  diffScene,
  isLeft,
  nodeId,
  projectGraph,
  runLayout,
  validateGraph,
  type GraphTransition,
  type GraphView,
} from "munchkeen/core";
import {
  createCytoscapeRenderer,
  type CytoscapeRendererSession,
} from "munchkeen/cytoscape";

void Graph;

const opaqueRenderer: GraphRenderer = {
  kind: "opaque",
  createSession: () => ({
    attach: () => undefined,
    applyCommands: () => undefined,
    dispose: () => undefined,
  }),
};

const opaqueSession = opaqueRenderer.createSession();

void opaqueSession;

// @ts-expect-error root GraphRenderer keeps low-level session typing opaque.
opaqueSession.attach({
  container: document.createElement("div"),
});

const focus = nodeId("alpha");

const view: GraphView = {
  focus,
  neighborhood: {
    radius: 1,
  },
};

const transition: GraphTransition = {
  type: "focus/set",
  focus,
};

void transition;

const validated = validateGraph({
  nodes: [{ id: focus, label: "Alpha" }],
  edges: [],
});

if (isLeft(validated)) {
  throw new Error(validated.left[0]?.message ?? "validation failed");
}

const projected = projectGraph({
  graph: validated.right,
  view,
});

if (isLeft(projected)) {
  throw new Error(projected.left.message);
}

const laidOut = runLayout({
  graph: projected.right,
});

if (isLeft(laidOut)) {
  throw new Error(laidOut.left.message);
}

const scene = buildRenderScene({
  graph: laidOut.right,
  view,
});

const commands = diffScene(undefined, scene);

void commands;

const selection: GraphSelection = scene.selection;

void selection;

const cytoscapeRenderer = createCytoscapeRenderer();
const created = cytoscapeRenderer.createSession();

if (!isLeft(created)) {
  const session: CytoscapeRendererSession = created.right;

  session.syncViewport();
}
