import { dedupe, mapFromEntries } from "./collections";
import { left, right, type Either } from "./either";
import { isJust, just, nothing, type Maybe } from "./maybe";
import type { EdgeId, GraphDataInput, GraphEdge, GraphNode, NodeId } from "./model";
import {
  fromReadonlyArray,
  mapReadonlyNonEmptyArray,
  type ReadonlyNonEmptyArray,
} from "./readonly-non-empty-array";

type NodeIdPath = readonly ["nodes", number, "id"];
type EdgeIdPath = readonly ["edges", number, "id"];
type EdgeEndpointPath = readonly ["edges", number, "source" | "target"];

export type DuplicateNodeIdGraphValidationError = {
  readonly code: "duplicate_node_id";
  readonly message: string;
  readonly nodeId: NodeId;
  readonly indices: ReadonlyNonEmptyArray<number>;
  readonly paths: ReadonlyNonEmptyArray<NodeIdPath>;
};

export type DuplicateEdgeIdGraphValidationError = {
  readonly code: "duplicate_edge_id";
  readonly message: string;
  readonly edgeId: EdgeId;
  readonly indices: ReadonlyNonEmptyArray<number>;
  readonly paths: ReadonlyNonEmptyArray<EdgeIdPath>;
};

export type DanglingEdgeReferenceGraphValidationError = {
  readonly code: "dangling_edge_reference";
  readonly message: string;
  readonly edgeId: EdgeId;
  readonly edgeIndex: number;
  readonly endpoint: "source" | "target";
  readonly nodeId: NodeId;
  readonly path: EdgeEndpointPath;
};

export type GraphValidationError =
  | DuplicateNodeIdGraphValidationError
  | DuplicateEdgeIdGraphValidationError
  | DanglingEdgeReferenceGraphValidationError;

export type ValidatedNode<NodeData = unknown, NodeKind extends string = string> = {
  readonly id: NodeId;
  readonly kind: Maybe<NodeKind>;
  readonly label: Maybe<string>;
  readonly data: Maybe<NodeData>;
};

export type ValidatedEdge<EdgeData = unknown, EdgeKind extends string = string> = {
  readonly id: EdgeId;
  readonly source: NodeId;
  readonly target: NodeId;
  readonly kind: Maybe<EdgeKind>;
  readonly label: Maybe<string>;
  readonly directed: boolean;
  readonly data: Maybe<EdgeData>;
};

export type NodeAdjacency = {
  readonly incomingEdgeIds: readonly EdgeId[];
  readonly outgoingEdgeIds: readonly EdgeId[];
  readonly incidentEdgeIds: readonly EdgeId[];
  readonly incomingNodeIds: readonly NodeId[];
  readonly outgoingNodeIds: readonly NodeId[];
  readonly neighborNodeIds: readonly NodeId[];
};

const validatedGraphSymbol: unique symbol = Symbol("ValidatedGraph");

export type ValidatedGraph<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly _tag: "ValidatedGraph";
  readonly [validatedGraphSymbol]: true;
  readonly nodes: readonly ValidatedNode<NodeData, NodeKind>[];
  readonly edges: readonly ValidatedEdge<EdgeData, EdgeKind>[];
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
  readonly nodeById: ReadonlyMap<NodeId, ValidatedNode<NodeData, NodeKind>>;
  readonly edgeById: ReadonlyMap<EdgeId, ValidatedEdge<EdgeData, EdgeKind>>;
  readonly adjacencyByNodeId: ReadonlyMap<NodeId, NodeAdjacency>;
};

// Keep this local for now: it encodes Step 3 normalization of optional graph
// input fields rather than committing to a package-wide Maybe helper surface.
const toMaybe = <A>(value: A | undefined): Maybe<A> =>
  value === undefined ? nothing : just(value);

const normalizeNode = <NodeData, NodeKind extends string>(
  node: GraphNode<NodeData, NodeKind>,
): ValidatedNode<NodeData, NodeKind> => ({
  id: node.id,
  kind: toMaybe(node.kind),
  label: toMaybe(node.label),
  data: toMaybe(node.data),
});

const normalizeEdge = <EdgeData, EdgeKind extends string>(
  edge: GraphEdge<EdgeData, EdgeKind>,
): ValidatedEdge<EdgeData, EdgeKind> => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  kind: toMaybe(edge.kind),
  label: toMaybe(edge.label),
  directed: edge.directed ?? false,
  data: toMaybe(edge.data),
});

const buildIndicesById = <Id>(ids: readonly Id[]): ReadonlyMap<Id, ReadonlyNonEmptyArray<number>> =>
  mapFromEntries(
    dedupe(ids).flatMap((id) => {
      const indices = fromReadonlyArray(
        ids.flatMap((candidateId, index) => (candidateId === id ? [index] : [])),
      );

      return isJust(indices) ? [[id, indices.value] as const] : [];
    }),
  );

const buildValueMapFromIndices = <Id, Value>(
  values: readonly Value[],
  indicesById: ReadonlyMap<Id, ReadonlyNonEmptyArray<number>>,
): ReadonlyMap<Id, Value> =>
  mapFromEntries(
    [...indicesById].flatMap(([id, indices]) => {
      const value = values[indices[0]];

      return value === undefined ? [] : [[id, value] as const];
    }),
  );

const collectDuplicateNodeIdErrors = (
  nodeIndicesById: ReadonlyMap<NodeId, ReadonlyNonEmptyArray<number>>,
): readonly DuplicateNodeIdGraphValidationError[] =>
  [...nodeIndicesById].flatMap(([nodeId, indices]) =>
    indices.length < 2
      ? []
      : [
          {
            code: "duplicate_node_id",
            message: `Duplicate node id "${nodeId}"`,
            nodeId,
            indices,
            paths: mapReadonlyNonEmptyArray(indices, (index) => ["nodes", index, "id"] as const),
          },
        ],
  );

const collectDuplicateEdgeIdErrors = (
  edgeIndicesById: ReadonlyMap<EdgeId, ReadonlyNonEmptyArray<number>>,
): readonly DuplicateEdgeIdGraphValidationError[] =>
  [...edgeIndicesById].flatMap(([edgeId, indices]) =>
    indices.length < 2
      ? []
      : [
          {
            code: "duplicate_edge_id",
            message: `Duplicate edge id "${edgeId}"`,
            edgeId,
            indices,
            paths: mapReadonlyNonEmptyArray(indices, (index) => ["edges", index, "id"] as const),
          },
        ],
  );

const collectDanglingEdgeReferenceErrors = <EdgeData, EdgeKind extends string>(
  edges: readonly ValidatedEdge<EdgeData, EdgeKind>[],
  nodeById: ReadonlyMap<NodeId, ValidatedNode>,
): readonly DanglingEdgeReferenceGraphValidationError[] =>
  edges.flatMap((edge, edgeIndex) => [
    ...(!nodeById.has(edge.source)
      ? [
          {
            code: "dangling_edge_reference" as const,
            message: `Edge "${edge.id}" references missing source node "${edge.source}"`,
            edgeId: edge.id,
            edgeIndex,
            endpoint: "source" as const,
            nodeId: edge.source,
            path: ["edges", edgeIndex, "source"] as const,
          },
        ]
      : []),
    ...(!nodeById.has(edge.target)
      ? [
          {
            code: "dangling_edge_reference" as const,
            message: `Edge "${edge.id}" references missing target node "${edge.target}"`,
            edgeId: edge.id,
            edgeIndex,
            endpoint: "target" as const,
            nodeId: edge.target,
            path: ["edges", edgeIndex, "target"] as const,
          },
        ]
      : []),
  ]);

type NodeReference = {
  readonly direction: "incoming" | "outgoing";
  readonly edgeId: EdgeId;
  readonly nodeId: NodeId;
};

const getNodeReferences = <EdgeData, EdgeKind extends string>(
  nodeId: NodeId,
  edges: readonly ValidatedEdge<EdgeData, EdgeKind>[],
): readonly NodeReference[] =>
  edges.flatMap((edge) => {
    if (edge.directed) {
      return [
        ...(edge.target === nodeId
          ? [
              {
                direction: "incoming" as const,
                edgeId: edge.id,
                nodeId: edge.source,
              },
            ]
          : []),
        ...(edge.source === nodeId
          ? [
              {
                direction: "outgoing" as const,
                edgeId: edge.id,
                nodeId: edge.target,
              },
            ]
          : []),
      ];
    }

    if (edge.source === nodeId) {
      return [
        {
          direction: "incoming" as const,
          edgeId: edge.id,
          nodeId: edge.target,
        },
        {
          direction: "outgoing" as const,
          edgeId: edge.id,
          nodeId: edge.target,
        },
      ];
    }

    if (edge.target === nodeId) {
      return [
        {
          direction: "incoming" as const,
          edgeId: edge.id,
          nodeId: edge.source,
        },
        {
          direction: "outgoing" as const,
          edgeId: edge.id,
          nodeId: edge.source,
        },
      ];
    }

    return [];
  });

const buildNodeAdjacency = <EdgeData, EdgeKind extends string>(
  nodeId: NodeId,
  edges: readonly ValidatedEdge<EdgeData, EdgeKind>[],
): NodeAdjacency => {
  const references = getNodeReferences(nodeId, edges);
  const incomingReferences = references.filter((reference) => reference.direction === "incoming");
  const outgoingReferences = references.filter((reference) => reference.direction === "outgoing");

  return {
    incomingEdgeIds: dedupe(incomingReferences.map((reference) => reference.edgeId)),
    outgoingEdgeIds: dedupe(outgoingReferences.map((reference) => reference.edgeId)),
    incidentEdgeIds: dedupe(references.map((reference) => reference.edgeId)),
    incomingNodeIds: dedupe(incomingReferences.map((reference) => reference.nodeId)),
    outgoingNodeIds: dedupe(outgoingReferences.map((reference) => reference.nodeId)),
    neighborNodeIds: dedupe(references.map((reference) => reference.nodeId)),
  };
};

const buildAdjacencyByNodeId = <
  NodeData,
  EdgeData,
  NodeKind extends string,
  EdgeKind extends string,
>(
  nodes: readonly ValidatedNode<NodeData, NodeKind>[],
  edges: readonly ValidatedEdge<EdgeData, EdgeKind>[],
): ReadonlyMap<NodeId, NodeAdjacency> =>
  mapFromEntries(nodes.map((node) => [node.id, buildNodeAdjacency(node.id, edges)] as const));

export const validateGraph = <
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
>(
  graph: GraphDataInput<NodeData, EdgeData, NodeKind, EdgeKind>,
): Either<
  ReadonlyNonEmptyArray<GraphValidationError>,
  ValidatedGraph<NodeData, EdgeData, NodeKind, EdgeKind>
> => {
  const nodes = graph.nodes.map(normalizeNode);
  const edges = graph.edges.map(normalizeEdge);

  const nodeIds = nodes.map((node) => node.id);
  const edgeIds = edges.map((edge) => edge.id);

  const nodeIndicesById = buildIndicesById(nodeIds);
  const edgeIndicesById = buildIndicesById(edgeIds);
  const nodeById = buildValueMapFromIndices(nodes, nodeIndicesById);
  const edgeById = buildValueMapFromIndices(edges, edgeIndicesById);

  const errors = [
    ...collectDuplicateNodeIdErrors(nodeIndicesById),
    ...collectDuplicateEdgeIdErrors(edgeIndicesById),
    ...collectDanglingEdgeReferenceErrors(edges, nodeById),
  ];

  const validationErrors = fromReadonlyArray(errors);

  if (isJust(validationErrors)) {
    return left(validationErrors.value);
  }

  return right({
    _tag: "ValidatedGraph",
    [validatedGraphSymbol]: true,
    nodes,
    edges,
    nodeIds,
    edgeIds,
    nodeById,
    edgeById,
    adjacencyByNodeId: buildAdjacencyByNodeId(nodes, edges),
  });
};
