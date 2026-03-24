import { describe, expect, it } from "vitest";

import { isLeft, isRight } from "../src/core/either";
import { edgeId, nodeId } from "../src/core/model";
import { projectGraph } from "../src/core/project";
import { validateGraph } from "../src/core/validate";

const expectValidatedGraph = <T>(result: T): T => result;

describe("projectGraph", () => {
  it("projects a focus-driven outgoing neighborhood with deterministic node and edge ordering", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const gamma = nodeId("gamma");
    const delta = nodeId("delta");
    const epsilon = nodeId("epsilon");
    const edgeAlphaBeta = edgeId("alpha-beta");
    const edgeGammaAlpha = edgeId("gamma-alpha");
    const edgeBetaDelta = edgeId("beta-delta");
    const edgeAlphaEpsilon = edgeId("alpha-epsilon");

    const validated = validateGraph({
      nodes: [{ id: alpha }, { id: beta }, { id: gamma }, { id: delta }, { id: epsilon }],
      edges: [
        { id: edgeAlphaBeta, source: alpha, target: beta, directed: true },
        { id: edgeGammaAlpha, source: gamma, target: alpha, directed: true },
        { id: edgeBetaDelta, source: beta, target: delta, directed: true },
        { id: edgeAlphaEpsilon, source: alpha, target: epsilon, directed: true },
      ],
    });

    expect(isRight(validated)).toBe(true);

    if (isRight(validated)) {
      const result = projectGraph({
        graph: expectValidatedGraph(validated.right),
        view: {
          focus: alpha,
          neighborhood: {
            radius: 2,
            direction: "out",
          },
        },
      });

      expect(isRight(result)).toBe(true);

      if (isRight(result)) {
        expect(result.right.nodeIds).toEqual([alpha, beta, delta, epsilon]);
        expect(result.right.edgeIds).toEqual([edgeAlphaBeta, edgeBetaDelta, edgeAlphaEpsilon]);
      }
    }
  });

  it("applies hidden node and edge filters after projection and keeps empty projections valid", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const edgeAlphaBeta = edgeId("alpha-beta");

    const validated = validateGraph({
      nodes: [{ id: alpha }, { id: beta }],
      edges: [{ id: edgeAlphaBeta, source: alpha, target: beta }],
    });

    expect(isRight(validated)).toBe(true);

    if (isRight(validated)) {
      const hidden = projectGraph({
        graph: expectValidatedGraph(validated.right),
        view: {
          hiddenNodeIds: [alpha, beta],
          hiddenEdgeIds: [edgeAlphaBeta],
        },
      });

      expect(isRight(hidden)).toBe(true);

      if (isRight(hidden)) {
        expect(hidden.right.nodeIds).toEqual([]);
        expect(hidden.right.edgeIds).toEqual([]);
        expect(hidden.right.nodes).toEqual([]);
        expect(hidden.right.edges).toEqual([]);
      }
    }
  });

  it("returns explicit projection-time failures for missing focus nodes and invalid neighborhood radii", () => {
    const alpha = nodeId("alpha");
    const missing = nodeId("missing");

    const validated = validateGraph({
      nodes: [{ id: alpha }],
      edges: [],
    });

    expect(isRight(validated)).toBe(true);

    if (isRight(validated)) {
      const missingFocus = projectGraph({
        graph: expectValidatedGraph(validated.right),
        view: {
          focus: missing,
        },
      });

      const invalidRadius = projectGraph({
        graph: expectValidatedGraph(validated.right),
        view: {
          focus: alpha,
          neighborhood: {
            radius: -1,
          },
        },
      });

      expect(isLeft(missingFocus)).toBe(true);
      expect(isLeft(invalidRadius)).toBe(true);

      if (isLeft(missingFocus)) {
        expect(missingFocus.left).toEqual({
          code: "missing_focus_node",
          message: `Projection focus "${missing}" does not exist in the validated graph`,
          focus: missing,
        });
      }

      if (isLeft(invalidRadius)) {
        expect(invalidRadius.left).toEqual({
          code: "invalid_neighborhood_radius",
          message: 'Projection radius "-1" must be a non-negative integer',
          radius: -1,
        });
      }
    }
  });

  it("projects the full validated graph when no neighborhood is requested", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const edgeAlphaBeta = edgeId("alpha-beta");

    const validated = validateGraph({
      nodes: [{ id: alpha }, { id: beta }],
      edges: [{ id: edgeAlphaBeta, source: alpha, target: beta }],
    });

    expect(isRight(validated)).toBe(true);

    if (isRight(validated)) {
      const result = projectGraph({
        graph: expectValidatedGraph(validated.right),
      });

      expect(isRight(result)).toBe(true);

      if (isRight(result)) {
        expect(result.right.nodeIds).toEqual([alpha, beta]);
        expect(result.right.edgeIds).toEqual([edgeAlphaBeta]);
      }
    }
  });
});
