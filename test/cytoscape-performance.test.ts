import { describe, expect, it } from "vitest";

import type { RenderCommandBatch } from "../src/core/commands";
import { diffScene } from "../src/core/diff";
import { isRight } from "../src/core/either";
import { edgeId, nodeId } from "../src/core/model";
import type { RenderEdge, RenderNode, RenderScene } from "../src/core/scene";
import {
  compareCytoscapeExecutionBaseline,
  createCytoscapeRenderer,
  describeCytoscapeFrameBudget,
} from "../src/renderers/cytoscape";

const makeNode = (
  id: ReturnType<typeof nodeId>,
  overrides: Partial<RenderNode> = {},
): RenderNode => ({
  id,
  position: { x: 0, y: 0 },
  label: undefined,
  appearance: {
    classNames: [],
    color: undefined,
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
  label: undefined,
  appearance: {
    classNames: [],
    color: undefined,
  },
  selected: false,
  ...overrides,
});

const makeScene = ({
  nodes,
  edges,
}: {
  readonly nodes: readonly RenderNode[];
  readonly edges: readonly RenderEdge[];
}): RenderScene => ({
  _tag: "RenderScene",
  nodes,
  edges,
  selection: {
    nodeIds: nodes.filter((node) => node.selected).map((node) => node.id),
    edgeIds: edges.filter((edge) => edge.selected).map((edge) => edge.id),
  },
});

const createNow = (...values: readonly number[]): (() => number) => {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;

    index += 1;

    return value;
  };
};

const buildFullReplaceBatch = (
  previous: RenderScene,
  next: RenderScene,
): RenderCommandBatch => [
  ...previous.edges.map((edge) => ({ type: "edge/remove", edgeId: edge.id } as const)),
  ...previous.nodes.map((node) => ({ type: "node/remove", nodeId: node.id } as const)),
  ...next.nodes.map((node) => ({ type: "node/add", node } as const)),
  ...next.edges.map((edge) => ({ type: "edge/add", edge } as const)),
];

describe("Cytoscape performance helpers", () => {
  it("reports frame-budget usage from measured runtime durations", () => {
    expect(describeCytoscapeFrameBudget(4, 10)).toEqual({
      frameBudgetMs: 10,
      frameBudgetRatio: 0.4,
      frameBudgetPercent: 40,
      withinFrameBudget: true,
    });
    expect(describeCytoscapeFrameBudget(12, 10)).toEqual({
      frameBudgetMs: 10,
      frameBudgetRatio: 1.2,
      frameBudgetPercent: 120,
      withinFrameBudget: false,
    });
  });

  it("compares a minimal diff batch against a full-replace batch for the same target scene", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");
    const previous = makeScene({
      nodes: [
        makeNode(alpha, {
          label: "Alpha",
          selected: true,
        }),
        makeNode(beta, {
          label: "Beta",
          position: { x: 120, y: 40 },
        }),
      ],
      edges: [
        makeEdge(alphaBeta, alpha, beta, {
          label: "Alpha -> Beta",
        }),
      ],
    });
    const next = makeScene({
      nodes: [
        makeNode(alpha, {
          label: "Alpha Prime",
        }),
        makeNode(beta, {
          label: "Beta",
          position: { x: 120, y: 40 },
          selected: true,
        }),
      ],
      edges: [
        makeEdge(alphaBeta, alpha, beta, {
          label: "Alpha to Beta",
          directed: true,
          selected: true,
        }),
      ],
    });
    const minimalBatch = diffScene(previous, next);
    const fullReplaceBatch = buildFullReplaceBatch(previous, next);
    const renderer = createCytoscapeRenderer();
    const minimalSession = renderer.createSession({
      headless: true,
      now: createNow(0, 2, 10, 14),
    });
    const fullReplaceSession = renderer.createSession({
      headless: true,
      now: createNow(0, 2, 10, 24),
    });

    expect(isRight(minimalSession)).toBe(true);
    expect(isRight(fullReplaceSession)).toBe(true);

    if (isRight(minimalSession) && isRight(fullReplaceSession)) {
      const minimal = minimalSession.right;
      const fullReplace = fullReplaceSession.right;

      const initialMinimal = minimal.applyCommands(diffScene(undefined, previous));
      const initialFullReplace = fullReplace.applyCommands(diffScene(undefined, previous));

      expect(isRight(initialMinimal)).toBe(true);
      expect(isRight(initialFullReplace)).toBe(true);

      const minimalResult = minimal.applyCommands(minimalBatch);
      const fullReplaceResult = fullReplace.applyCommands(fullReplaceBatch);

      expect(isRight(minimalResult)).toBe(true);
      expect(isRight(fullReplaceResult)).toBe(true);

      if (isRight(minimalResult) && isRight(fullReplaceResult)) {
        expect(minimalResult.right.commandCount).toBe(minimalBatch.length);
        expect(fullReplaceResult.right.commandCount).toBe(fullReplaceBatch.length);

        const baseline = compareCytoscapeExecutionBaseline({
          minimal: minimalResult.right,
          fullReplace: fullReplaceResult.right,
        });

        expect(baseline).toEqual({
          minimalDurationMs: 4,
          fullReplaceDurationMs: 14,
          durationSavedMs: 10,
          relativeDurationRatio: 4 / 14,
          minimalCommandCount: minimalBatch.length,
          fullReplaceCommandCount: fullReplaceBatch.length,
          commandsSaved: fullReplaceBatch.length - minimalBatch.length,
          relativeCommandRatio: minimalBatch.length / fullReplaceBatch.length,
        });
        expect(minimal.cy.$id(alpha).data()).toEqual(fullReplace.cy.$id(alpha).data());
        expect(minimal.cy.$id(alpha).selected()).toBe(fullReplace.cy.$id(alpha).selected());
        expect(minimal.cy.$id(beta).selected()).toBe(true);
        expect(fullReplace.cy.$id(beta).selected()).toBe(true);
        expect(minimal.cy.$id(alphaBeta).classes()).toEqual(["mk-directed"]);
        expect(fullReplace.cy.$id(alphaBeta).classes()).toEqual(["mk-directed"]);
      }

      minimal.dispose();
      fullReplace.dispose();
    }
  });
});
