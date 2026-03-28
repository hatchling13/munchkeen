import { dedupe } from "../../core/collections";
import type { RenderEdge, RenderNode } from "../../core/scene";

const DEFAULT_NODE_COLOR = "#94a3b8";
const DEFAULT_EDGE_COLOR = "#64748b";

type CytoscapeNodeElementData = {
  readonly id: string;
  readonly label?: string;
  readonly color: string;
};

type CytoscapeEdgeElementData = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  readonly color: string;
};

export type CytoscapeNodeElement = {
  readonly group: "nodes";
  readonly data: CytoscapeNodeElementData;
  readonly position: RenderNode["position"];
  readonly selected: boolean;
  readonly classes: string[];
};

export type CytoscapeEdgeElement = {
  readonly group: "edges";
  readonly data: CytoscapeEdgeElementData;
  readonly selected: boolean;
  readonly classes: string[];
};

export type CytoscapeElement = CytoscapeNodeElement | CytoscapeEdgeElement;

const getNodeClasses = (node: RenderNode): readonly string[] =>
  dedupe([...node.appearance.classNames, ...(node.focused ? ["mk-focused"] : [])]);

const getEdgeClasses = (edge: RenderEdge): readonly string[] =>
  dedupe([...edge.appearance.classNames, ...(edge.directed ? ["mk-directed"] : [])]);

export const toCytoscapeNodeElement = (node: RenderNode): CytoscapeNodeElement => ({
  group: "nodes",
  data: {
    id: node.id,
    label: node.label ?? "",
    color: node.appearance.color ?? DEFAULT_NODE_COLOR,
  },
  position: node.position,
  selected: node.selected,
  classes: [...getNodeClasses(node)],
});

export const toCytoscapeEdgeElement = (edge: RenderEdge): CytoscapeEdgeElement => ({
  group: "edges",
  data: {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label ?? "",
    color: edge.appearance.color ?? DEFAULT_EDGE_COLOR,
  },
  selected: edge.selected,
  classes: [...getEdgeClasses(edge)],
});
