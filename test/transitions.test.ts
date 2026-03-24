import { describe, expect, it } from "vitest";

import { edgeId, nodeId } from "../src/core/model";
import { applyGraphTransition, applyGraphTransitions } from "../src/core/transitions";

describe("Graph view transitions", () => {
  it("applies focus, neighborhood, selection, and visibility transitions purely", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const gamma = nodeId("gamma");
    const edge = edgeId("alpha-beta");

    const expanded = applyGraphTransition(undefined, {
      type: "neighborhood/expand",
      focus: alpha,
      radius: 2,
      direction: "out",
    });

    expect(expanded).toEqual({
      focus: alpha,
      neighborhood: {
        radius: 2,
        direction: "out",
      },
    });

    const updated = applyGraphTransitions(expanded, [
      {
        type: "selection/set",
        nodeIds: [alpha, beta, alpha],
        edgeIds: [edge, edge],
      },
      {
        type: "visibility/hide-nodes",
        nodeIds: [beta, gamma, beta],
      },
      {
        type: "visibility/hide-edges",
        edgeIds: [edge, edge],
      },
      {
        type: "visibility/show-nodes",
        nodeIds: [gamma],
      },
    ]);

    expect(updated).toEqual({
      focus: alpha,
      neighborhood: {
        radius: 2,
        direction: "out",
      },
      selectedNodeIds: [alpha, beta],
      selectedEdgeIds: [edge],
      hiddenNodeIds: [beta],
      hiddenEdgeIds: [edge],
    });
  });

  it("clears neighborhood when focus is removed and keeps viewport state out of the model", () => {
    const alpha = nodeId("alpha");
    const edge = edgeId("alpha-beta");

    const view = applyGraphTransitions(undefined, [
      {
        type: "neighborhood/expand",
        focus: alpha,
        radius: 1,
      },
      {
        type: "selection/set",
        nodeIds: [alpha],
        edgeIds: [edge],
      },
      {
        type: "selection/clear",
      },
      {
        type: "focus/set",
        focus: null,
      },
    ]);

    expect(view).toEqual({
      focus: null,
      selectedNodeIds: undefined,
      selectedEdgeIds: undefined,
      neighborhood: undefined,
    });
  });
});
