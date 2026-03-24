import { dedupe, mapFromEntries } from "./collections";
import { left, right, type Either } from "./either";
import type { EdgeId, GraphNeighborhood, GraphView, NodeId } from "./model";
import type { NodeAdjacency, ValidatedEdge, ValidatedGraph, ValidatedNode } from "./validate";

export type MissingFocusNodeProjectionError = {
  readonly code: "missing_focus_node";
  readonly message: string;
  readonly focus: NodeId;
};

export type InvalidNeighborhoodRadiusProjectionError = {
  readonly code: "invalid_neighborhood_radius";
  readonly message: string;
  readonly radius: number;
};

export type ProjectionError =
  | MissingFocusNodeProjectionError
  | InvalidNeighborhoodRadiusProjectionError;

export type ProjectGraphInput<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly graph: ValidatedGraph<NodeData, EdgeData, NodeKind, EdgeKind>;
  readonly view?: GraphView;
};

const projectedGraphSymbol: unique symbol = Symbol("ProjectedGraph");

export type ProjectedGraph<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly _tag: "ProjectedGraph";
  readonly [projectedGraphSymbol]: true;
  readonly nodes: readonly ValidatedNode<NodeData, NodeKind>[];
  readonly edges: readonly ValidatedEdge<EdgeData, EdgeKind>[];
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
  readonly nodeById: ReadonlyMap<NodeId, ValidatedNode<NodeData, NodeKind>>;
  readonly edgeById: ReadonlyMap<EdgeId, ValidatedEdge<EdgeData, EdgeKind>>;
};

// This is the current validation boundary for neighborhood radius semantics.
// The projection engine treats radius as an integer hop count. Negative and
// fractional values have no meaning in this traversal model. If weighted or
// continuous distance is needed later, prefer a distinct projection mode or
// field instead of silently reinterpreting this radius.
const isValidNeighborhoodRadius = (radius: number): boolean =>
  Number.isInteger(radius) && radius >= 0;

const getTraversableEdgeIds = (
  adjacency: NodeAdjacency,
  direction: GraphNeighborhood["direction"],
): readonly EdgeId[] => {
  switch (direction) {
    case "in":
      return adjacency.incomingEdgeIds;
    case "out":
      return adjacency.outgoingEdgeIds;
    case "both":
    case undefined:
      return adjacency.incidentEdgeIds;
  }
};

const getNextNodeId = <EdgeData, EdgeKind extends string>(
  currentNodeId: NodeId,
  edge: ValidatedEdge<EdgeData, EdgeKind>,
  direction: GraphNeighborhood["direction"],
): NodeId => {
  if (!edge.directed) {
    return edge.source === currentNodeId ? edge.target : edge.source;
  }

  switch (direction) {
    case "in":
      return edge.source;
    case "out":
      return edge.target;
    case "both":
    case undefined:
      return edge.source === currentNodeId ? edge.target : edge.source;
  }
};

type NeighborhoodTraversal = {
  readonly edgeId: EdgeId;
  readonly nextNodeId: NodeId;
};

const getNeighborhoodTraversals = <
  NodeData,
  EdgeData,
  NodeKind extends string,
  EdgeKind extends string,
>(
  graph: ValidatedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  frontierNodeIds: readonly NodeId[],
  direction: GraphNeighborhood["direction"],
): readonly NeighborhoodTraversal[] =>
  frontierNodeIds.flatMap((nodeId) => {
    const adjacency = graph.adjacencyByNodeId.get(nodeId);

    if (!adjacency) {
      return [];
    }

    return getTraversableEdgeIds(adjacency, direction).flatMap((edgeId) => {
      const edge = graph.edgeById.get(edgeId);

      if (!edge) {
        return [];
      }

      return [
        {
          edgeId,
          nextNodeId: getNextNodeId(nodeId, edge, direction),
        },
      ];
    });
  });

const expandNeighborhoodProjection = <
  NodeData,
  EdgeData,
  NodeKind extends string,
  EdgeKind extends string,
>(
  graph: ValidatedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  direction: GraphNeighborhood["direction"],
  state: {
    readonly visibleNodeIds: readonly NodeId[];
    readonly visibleEdgeIds: readonly EdgeId[];
    readonly frontierNodeIds: readonly NodeId[];
    readonly remainingDepth: number;
  },
): {
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
} => {
  if (state.remainingDepth === 0 || state.frontierNodeIds.length === 0) {
    return {
      nodeIds: state.visibleNodeIds,
      edgeIds: state.visibleEdgeIds,
    };
  }

  const traversals = getNeighborhoodTraversals(graph, state.frontierNodeIds, direction);
  const nextEdgeIds = dedupe(traversals.map((traversal) => traversal.edgeId));
  const nextNodeIds = dedupe(
    traversals
      .map((traversal) => traversal.nextNodeId)
      .filter((nodeId) => !state.visibleNodeIds.includes(nodeId)),
  );

  return expandNeighborhoodProjection(graph, direction, {
    frontierNodeIds: nextNodeIds,
    remainingDepth: state.remainingDepth - 1,
    visibleNodeIds: [...state.visibleNodeIds, ...nextNodeIds],
    visibleEdgeIds: dedupe([...state.visibleEdgeIds, ...nextEdgeIds]),
  });
};

const projectNeighborhood = <NodeData, EdgeData, NodeKind extends string, EdgeKind extends string>(
  graph: ValidatedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  focus: NodeId,
  radius: number,
  direction: GraphNeighborhood["direction"],
): {
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
} =>
  expandNeighborhoodProjection(graph, direction, {
    visibleNodeIds: [focus],
    visibleEdgeIds: [],
    frontierNodeIds: [focus],
    remainingDepth: radius,
  });

const buildProjectedGraph = <NodeData, EdgeData, NodeKind extends string, EdgeKind extends string>(
  graph: ValidatedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  projectedNodeIds: readonly NodeId[],
  projectedEdgeIds: readonly EdgeId[] | undefined,
  hiddenNodeIds: readonly NodeId[] | undefined,
  hiddenEdgeIds: readonly EdgeId[] | undefined,
): ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind> => {
  const projectedNodeIdSet = new Set(projectedNodeIds);
  const projectedEdgeIdSet = projectedEdgeIds ? new Set(projectedEdgeIds) : undefined;
  const hiddenNodeIdSet = new Set(hiddenNodeIds ?? []);
  const hiddenEdgeIdSet = new Set(hiddenEdgeIds ?? []);

  const nodes = graph.nodes.filter(
    (node) => projectedNodeIdSet.has(node.id) && !hiddenNodeIdSet.has(node.id),
  );

  const visibleNodeIdSet = new Set(nodes.map((node) => node.id));

  const edges = graph.edges.filter((edge) => {
    if (hiddenEdgeIdSet.has(edge.id)) {
      return false;
    }

    if (projectedEdgeIdSet && !projectedEdgeIdSet.has(edge.id)) {
      return false;
    }

    return visibleNodeIdSet.has(edge.source) && visibleNodeIdSet.has(edge.target);
  });

  return {
    _tag: "ProjectedGraph",
    [projectedGraphSymbol]: true,
    nodes,
    edges,
    nodeIds: nodes.map((node) => node.id),
    edgeIds: edges.map((edge) => edge.id),
    nodeById: mapFromEntries(nodes.map((node) => [node.id, node] as const)),
    edgeById: mapFromEntries(edges.map((edge) => [edge.id, edge] as const)),
  };
};

export const projectGraph = <
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
>({
  graph,
  view,
}: ProjectGraphInput<NodeData, EdgeData, NodeKind, EdgeKind>): Either<
  ProjectionError,
  ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>
> => {
  // Keep Step 5 projection logic direct while GraphView only contributes a
  // small set of projection concerns. If future view growth forces this
  // function to validate or normalize several independent concerns here, add an
  // internal ProjectionSpec-like step first so projection executes normalized
  // intent rather than broad GraphView state.
  if (view?.focus !== undefined && view.focus !== null && !graph.nodeById.has(view.focus)) {
    return left({
      code: "missing_focus_node",
      message: `Projection focus "${view.focus}" does not exist in the validated graph`,
      focus: view.focus,
    });
  }

  if (view?.neighborhood) {
    const { focus, neighborhood } = view;

    if (!isValidNeighborhoodRadius(neighborhood.radius)) {
      return left({
        code: "invalid_neighborhood_radius",
        message: `Projection radius "${String(neighborhood.radius)}" must be a non-negative integer`,
        radius: neighborhood.radius,
      });
    }

    const neighborhoodProjection = projectNeighborhood(
      graph,
      focus,
      neighborhood.radius,
      neighborhood.direction,
    );

    return right(
      buildProjectedGraph(
        graph,
        neighborhoodProjection.nodeIds,
        neighborhoodProjection.edgeIds,
        view.hiddenNodeIds,
        view.hiddenEdgeIds,
      ),
    );
  }

  return right(
    buildProjectedGraph(graph, graph.nodeIds, undefined, view?.hiddenNodeIds, view?.hiddenEdgeIds),
  );
};
