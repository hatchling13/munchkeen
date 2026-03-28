import type cytoscape from "cytoscape";

import type {
  GraphRendererEvent,
  GraphSelection,
  Subscription,
} from "../../core/api";
import { edgeId, nodeId } from "../../core/model";

export type CytoscapeEventName = "tap" | "select" | "unselect";

export type CytoscapeRendererEvent = GraphRendererEvent;

export type CytoscapeRendererEventHandler = (
  event: CytoscapeRendererEvent,
) => void;

export const getCytoscapeSelection = (cy: cytoscape.Core): GraphSelection => ({
  nodeIds: cy
    .$("node:selected")
    .toArray()
    .map((node) => nodeId(node.id())),
  edgeIds: cy
    .$("edge:selected")
    .toArray()
    .map((edge) => edgeId(edge.id())),
});

export const bindCytoscapeEvents = ({
  cy,
  onEvent,
}: {
  readonly cy: cytoscape.Core;
  readonly onEvent?: CytoscapeRendererEventHandler;
}): Subscription => {
  if (onEvent === undefined) {
    return {
      unsubscribe: () => {},
    };
  }

  const handleNodeTap = (event: cytoscape.EventObjectNode): void => {
    onEvent({
      type: "node/activate",
      nodeId: nodeId(event.target.id()),
    });
  };

  const handleSelectionChange = (): void => {
    onEvent({
      type: "selection/change",
      selection: getCytoscapeSelection(cy),
    });
  };

  cy.on("tap", "node", handleNodeTap);
  cy.on("select unselect", "node, edge", handleSelectionChange);

  return {
    unsubscribe: () => {
      cy.off("tap", "node", handleNodeTap);
      cy.off("select unselect", "node, edge", handleSelectionChange);
    },
  };
};
