import { describe, expect, it } from "vitest";

import { isLeft, isRight } from "../src/core/either";
import { isJust, isNothing } from "../src/core/maybe";
import { edgeId, nodeId } from "../src/core/model";
import { validateGraph } from "../src/core/validate";

describe("validateGraph", () => {
  it("normalizes graph values and builds deterministic indexes", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const gamma = nodeId("gamma");
    const alphaBeta = edgeId("alpha-beta");
    const betaGamma = edgeId("beta-gamma");

    const result = validateGraph({
      nodes: [
        { id: alpha },
        {
          id: beta,
          kind: "person",
          label: "Beta",
          data: { title: "engineer" },
        },
        { id: gamma },
      ],
      edges: [
        { id: alphaBeta, source: alpha, target: beta },
        {
          id: betaGamma,
          source: beta,
          target: gamma,
          kind: "reportsTo",
          label: "reports to",
          directed: true,
        },
      ],
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result)) {
      const graph = result.right;
      const normalizedAlpha = graph.nodeById.get(alpha);
      const normalizedBeta = graph.nodeById.get(beta);
      const normalizedAlphaBeta = graph.edgeById.get(alphaBeta);
      const normalizedBetaGamma = graph.edgeById.get(betaGamma);
      const alphaAdjacency = graph.adjacencyByNodeId.get(alpha);
      const betaAdjacency = graph.adjacencyByNodeId.get(beta);
      const gammaAdjacency = graph.adjacencyByNodeId.get(gamma);

      expect(graph._tag).toBe("ValidatedGraph");
      expect(graph.nodeIds).toEqual([alpha, beta, gamma]);
      expect(graph.edgeIds).toEqual([alphaBeta, betaGamma]);
      expect(graph.nodeById.size).toBe(3);
      expect(graph.edgeById.size).toBe(2);

      expect(normalizedAlpha).toBeDefined();
      expect(normalizedBeta).toBeDefined();
      expect(normalizedAlphaBeta).toBeDefined();
      expect(normalizedBetaGamma).toBeDefined();
      expect(alphaAdjacency).toBeDefined();
      expect(betaAdjacency).toBeDefined();
      expect(gammaAdjacency).toBeDefined();

      if (
        normalizedAlpha &&
        normalizedBeta &&
        normalizedAlphaBeta &&
        normalizedBetaGamma &&
        alphaAdjacency &&
        betaAdjacency &&
        gammaAdjacency
      ) {
        expect(isNothing(normalizedAlpha.kind)).toBe(true);
        expect(isNothing(normalizedAlpha.label)).toBe(true);
        expect(isNothing(normalizedAlpha.data)).toBe(true);

        expect(isJust(normalizedBeta.kind)).toBe(true);
        expect(isJust(normalizedBeta.label)).toBe(true);
        expect(isJust(normalizedBeta.data)).toBe(true);

        if (
          isJust(normalizedBeta.kind) &&
          isJust(normalizedBeta.label) &&
          isJust(normalizedBeta.data)
        ) {
          expect(normalizedBeta.kind.value).toBe("person");
          expect(normalizedBeta.label.value).toBe("Beta");
          expect(normalizedBeta.data.value).toEqual({ title: "engineer" });
        }

        expect(normalizedAlphaBeta.directed).toBe(false);
        expect(isNothing(normalizedAlphaBeta.kind)).toBe(true);
        expect(isNothing(normalizedAlphaBeta.label)).toBe(true);
        expect(normalizedBetaGamma.directed).toBe(true);

        if (isJust(normalizedBetaGamma.kind) && isJust(normalizedBetaGamma.label)) {
          expect(normalizedBetaGamma.kind.value).toBe("reportsTo");
          expect(normalizedBetaGamma.label.value).toBe("reports to");
        }

        expect(alphaAdjacency).toEqual({
          incomingEdgeIds: [alphaBeta],
          outgoingEdgeIds: [alphaBeta],
          incidentEdgeIds: [alphaBeta],
          incomingNodeIds: [beta],
          outgoingNodeIds: [beta],
          neighborNodeIds: [beta],
        });
        expect(betaAdjacency).toEqual({
          incomingEdgeIds: [alphaBeta],
          outgoingEdgeIds: [alphaBeta, betaGamma],
          incidentEdgeIds: [alphaBeta, betaGamma],
          incomingNodeIds: [alpha],
          outgoingNodeIds: [alpha, gamma],
          neighborNodeIds: [alpha, gamma],
        });
        expect(gammaAdjacency).toEqual({
          incomingEdgeIds: [betaGamma],
          outgoingEdgeIds: [],
          incidentEdgeIds: [betaGamma],
          incomingNodeIds: [beta],
          outgoingNodeIds: [],
          neighborNodeIds: [beta],
        });
      }
    }
  });

  it("collects duplicate ids and dangling edge references as structured errors", () => {
    const sharedNodeId = nodeId("shared-node");
    const stableNodeId = nodeId("stable-node");
    const sharedEdgeId = edgeId("shared-edge");
    const missingTargetId = nodeId("missing-target");
    const missingSourceId = nodeId("missing-source");

    const result = validateGraph({
      nodes: [{ id: sharedNodeId }, { id: sharedNodeId }, { id: stableNodeId }],
      edges: [
        { id: sharedEdgeId, source: sharedNodeId, target: missingTargetId },
        { id: sharedEdgeId, source: missingSourceId, target: stableNodeId },
      ],
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left).toHaveLength(4);

      const [duplicateNodeId, duplicateEdgeId, danglingTarget, danglingSource] = result.left;

      expect(duplicateNodeId).toEqual({
        code: "duplicate_node_id",
        message: `Duplicate node id "${sharedNodeId}"`,
        nodeId: sharedNodeId,
        indices: [0, 1],
        paths: [
          ["nodes", 0, "id"],
          ["nodes", 1, "id"],
        ],
      });

      expect(duplicateEdgeId).toEqual({
        code: "duplicate_edge_id",
        message: `Duplicate edge id "${sharedEdgeId}"`,
        edgeId: sharedEdgeId,
        indices: [0, 1],
        paths: [
          ["edges", 0, "id"],
          ["edges", 1, "id"],
        ],
      });

      expect(danglingTarget).toEqual({
        code: "dangling_edge_reference",
        message: `Edge "${sharedEdgeId}" references missing target node "${missingTargetId}"`,
        edgeId: sharedEdgeId,
        edgeIndex: 0,
        endpoint: "target",
        nodeId: missingTargetId,
        path: ["edges", 0, "target"],
      });

      expect(danglingSource).toEqual({
        code: "dangling_edge_reference",
        message: `Edge "${sharedEdgeId}" references missing source node "${missingSourceId}"`,
        edgeId: sharedEdgeId,
        edgeIndex: 1,
        endpoint: "source",
        nodeId: missingSourceId,
        path: ["edges", 1, "source"],
      });
    }
  });
});
