import { describe, expect, expectTypeOf, it } from "vitest";

import type { RenderCommand } from "../src/core/commands";
import { diffScene } from "../src/core/diff";
import { edgeId, nodeId } from "../src/core/model";
import type { RenderEdge, RenderNode, RenderScene } from "../src/core/scene";

const makeNode = (
  id: ReturnType<typeof nodeId>,
  overrides: Partial<RenderNode> = {},
): RenderNode => ({
  id,
  position: { x: 0, y: 0 },
  appearance: {
    classNames: [],
  },
  focused: false,
  selected: false,
  ...overrides,
});

const makeEdge = (
  id: ReturnType<typeof edgeId>,
  source: ReturnType<typeof nodeId>,
  target: ReturnType<typeof nodeId>,
  overrides: Partial<RenderEdge> = {},
): RenderEdge => ({
  id,
  source,
  target,
  directed: false,
  appearance: {
    classNames: [],
  },
  selected: false,
  ...overrides,
});

const makeScene = ({
  nodes,
  edges,
  selection,
}: {
  readonly nodes: readonly RenderNode[];
  readonly edges: readonly RenderEdge[];
  readonly selection?: RenderScene["selection"];
}): RenderScene => ({
  _tag: "RenderScene",
  nodes,
  edges,
  selection: selection ?? {
    nodeIds: [],
    edgeIds: [],
  },
});

describe("diffScene", () => {
  it("returns a full add batch for the initial render in node-then-edge order", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");
    const scene = makeScene({
      nodes: [makeNode(alpha), makeNode(beta)],
      edges: [makeEdge(alphaBeta, alpha, beta)],
    });

    const diff = diffScene(undefined, scene);

    expect(diff).toEqual([
      { type: "node/add", node: scene.nodes[0] },
      { type: "node/add", node: scene.nodes[1] },
      { type: "edge/add", edge: scene.edges[0] },
    ]);
    expectTypeOf(diff).toEqualTypeOf<readonly RenderCommand[]>();
  });

  it("emits removals before node work, then emits node work before edge work deterministically", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const gamma = nodeId("gamma");
    const delta = nodeId("delta");
    const alphaBeta = edgeId("alpha-beta");
    const betaGamma = edgeId("beta-gamma");
    const gammaDelta = edgeId("gamma-delta");

    const previous = makeScene({
      nodes: [makeNode(alpha), makeNode(beta), makeNode(gamma)],
      edges: [makeEdge(alphaBeta, alpha, beta), makeEdge(betaGamma, beta, gamma)],
    });
    const next = makeScene({
      nodes: [
        makeNode(beta, { label: "Beta", selected: true }),
        makeNode(gamma),
        makeNode(delta, { position: { x: 40, y: 80 } }),
      ],
      edges: [
        makeEdge(betaGamma, beta, gamma, { label: "Beta -> Gamma", directed: true }),
        makeEdge(gammaDelta, gamma, delta),
      ],
      selection: {
        nodeIds: [beta],
        edgeIds: [],
      },
    });

    expect(diffScene(previous, next)).toEqual([
      { type: "edge/remove", edgeId: alphaBeta },
      { type: "node/remove", nodeId: alpha },
      { type: "node/update", node: next.nodes[0] },
      { type: "node/add", node: next.nodes[2] },
      { type: "edge/update", edge: next.edges[0] },
      { type: "edge/add", edge: next.edges[1] },
    ]);
  });

  it("ignores scene-level selection ordering changes when rendered node and edge state is unchanged", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");
    const selectedAlpha = makeNode(alpha, { selected: true });
    const selectedBeta = makeNode(beta, { selected: true });
    const selectedEdge = makeEdge(alphaBeta, alpha, beta, { selected: true });
    const previous = makeScene({
      nodes: [selectedAlpha, selectedBeta],
      edges: [selectedEdge],
      selection: {
        nodeIds: [alpha, beta],
        edgeIds: [alphaBeta],
      },
    });
    const next = makeScene({
      nodes: [selectedAlpha, selectedBeta],
      edges: [selectedEdge],
      selection: {
        nodeIds: [beta, alpha],
        edgeIds: [alphaBeta],
      },
    });

    expect(diffScene(previous, next)).toEqual([]);
  });
});
