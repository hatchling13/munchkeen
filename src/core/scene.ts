import { dedupe } from "./collections";
import type { GraphSelection } from "./api";
import type { LaidOutGraph, LayoutPosition } from "./layout";
import { isJust, type Maybe } from "./maybe";
import type { EdgeId, GraphView, NodeId } from "./model";
import {
  resolveEdgeTheme,
  resolveNodeTheme,
  type GraphTheme,
} from "./theme";

export type RenderNodeAppearance = {
  readonly classNames: readonly string[];
  readonly color?: string;
};

export type RenderEdgeAppearance = {
  readonly classNames: readonly string[];
  readonly color?: string;
};

export type RenderNode = {
  readonly id: NodeId;
  readonly position: LayoutPosition;
  readonly label?: string;
  readonly appearance: RenderNodeAppearance;
  readonly focused: boolean;
  readonly selected: boolean;
};

export type RenderEdge = {
  readonly id: EdgeId;
  readonly source: NodeId;
  readonly target: NodeId;
  readonly directed: boolean;
  readonly label?: string;
  readonly appearance: RenderEdgeAppearance;
  readonly selected: boolean;
};

export type RenderScene = {
  readonly _tag: "RenderScene";
  readonly nodes: readonly RenderNode[];
  readonly edges: readonly RenderEdge[];
  readonly selection: GraphSelection;
};

export type BuildRenderSceneInput<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly graph: LaidOutGraph<NodeData, EdgeData, NodeKind, EdgeKind>;
  readonly view?: GraphView;
  readonly theme?: GraphTheme<NodeKind, EdgeKind>;
};

const maybeValue = <A>(value: Maybe<A>): A | undefined => (isJust(value) ? value.value : undefined);

const getNodePosition = <
  NodeData,
  EdgeData,
  NodeKind extends string,
  EdgeKind extends string,
>(
  graph: LaidOutGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  nodeId: NodeId,
): LayoutPosition => {
  const position = graph.positions.get(nodeId);

  if (position === undefined) {
    throw new Error(`LaidOutGraph is missing a position for node "${nodeId}"`);
  }

  return position;
};

const buildGraphSelection = <
  NodeData,
  EdgeData,
  NodeKind extends string,
  EdgeKind extends string,
>(
  graph: LaidOutGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  view: GraphView | undefined,
): GraphSelection => {
  return {
    nodeIds: dedupe(view?.selectedNodeIds ?? []).filter((nodeId) => graph.nodeById.has(nodeId)),
    edgeIds: dedupe(view?.selectedEdgeIds ?? []).filter((edgeId) => graph.edgeById.has(edgeId)),
  };
};

export const buildRenderScene = <
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
>({
  graph,
  view,
  theme,
}: BuildRenderSceneInput<NodeData, EdgeData, NodeKind, EdgeKind>): RenderScene => {
  const selection = buildGraphSelection(graph, view);
  const selectedNodeIdSet = new Set(selection.nodeIds);
  const selectedEdgeIdSet = new Set(selection.edgeIds);

  return {
    _tag: "RenderScene",
    nodes: graph.nodes.map((node) => {
      const resolvedTheme = resolveNodeTheme(theme, node.kind);

      return {
        id: node.id,
        position: getNodePosition(graph, node.id),
        label: resolvedTheme.label ?? maybeValue(node.label),
        appearance: {
          classNames: resolvedTheme.classNames,
          color: resolvedTheme.color,
        },
        focused: view?.focus === node.id,
        selected: selectedNodeIdSet.has(node.id),
      };
    }),
    edges: graph.edges.map((edge) => {
      const resolvedTheme = resolveEdgeTheme(theme, edge.kind);

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        directed: edge.directed,
        label: resolvedTheme.label ?? maybeValue(edge.label),
        appearance: {
          classNames: resolvedTheme.classNames,
          color: resolvedTheme.color,
        },
        selected: selectedEdgeIdSet.has(edge.id),
      };
    }),
    selection,
  };
};
