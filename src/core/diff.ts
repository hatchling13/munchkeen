import { mapFromEntries } from "./collections";
import type { RenderCommand, RenderCommandBatch } from "./commands";
import type {
  RenderEdge,
  RenderEdgeAppearance,
  RenderNode,
  RenderNodeAppearance,
  RenderScene,
} from "./scene";

const areReadonlyArraysEqual = <A>(left: readonly A[], right: readonly A[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const areNodeAppearancesEqual = (
  left: RenderNodeAppearance,
  right: RenderNodeAppearance,
): boolean =>
  left.color === right.color && areReadonlyArraysEqual(left.classNames, right.classNames);

const areEdgeAppearancesEqual = (
  left: RenderEdgeAppearance,
  right: RenderEdgeAppearance,
): boolean =>
  left.color === right.color && areReadonlyArraysEqual(left.classNames, right.classNames);

const areRenderNodesEqual = (left: RenderNode, right: RenderNode): boolean =>
  left.id === right.id &&
  left.label === right.label &&
  left.focused === right.focused &&
  left.selected === right.selected &&
  left.position.x === right.position.x &&
  left.position.y === right.position.y &&
  areNodeAppearancesEqual(left.appearance, right.appearance);

const areRenderEdgesEqual = (left: RenderEdge, right: RenderEdge): boolean =>
  left.id === right.id &&
  left.source === right.source &&
  left.target === right.target &&
  left.directed === right.directed &&
  left.label === right.label &&
  left.selected === right.selected &&
  areEdgeAppearancesEqual(left.appearance, right.appearance);

const buildNodeById = (nodes: readonly RenderNode[]): ReadonlyMap<RenderNode["id"], RenderNode> =>
  mapFromEntries(nodes.map((node) => [node.id, node] as const));

const buildEdgeById = (edges: readonly RenderEdge[]): ReadonlyMap<RenderEdge["id"], RenderEdge> =>
  mapFromEntries(edges.map((edge) => [edge.id, edge] as const));

const diffNodeAddsAndUpdates = (
  previousNodesById: ReadonlyMap<RenderNode["id"], RenderNode>,
  nextNodes: readonly RenderNode[],
): RenderCommandBatch =>
  nextNodes.flatMap<RenderCommand>((node) => {
    const previousNode = previousNodesById.get(node.id);

    if (previousNode === undefined) {
      return { type: "node/add", node };
    }

    return areRenderNodesEqual(previousNode, node) ? [] : { type: "node/update", node };
  });

const diffEdgeAddsAndUpdates = (
  previousEdgesById: ReadonlyMap<RenderEdge["id"], RenderEdge>,
  nextEdges: readonly RenderEdge[],
): RenderCommandBatch =>
  nextEdges.flatMap<RenderCommand>((edge) => {
    const previousEdge = previousEdgesById.get(edge.id);

    if (previousEdge === undefined) {
      return { type: "edge/add", edge };
    }

    return areRenderEdgesEqual(previousEdge, edge) ? [] : { type: "edge/update", edge };
  });

const diffEdgeRemovals = (
  previousEdges: readonly RenderEdge[],
  nextEdgesById: ReadonlyMap<RenderEdge["id"], RenderEdge>,
): RenderCommandBatch =>
  previousEdges.flatMap<RenderCommand>((edge) =>
    nextEdgesById.has(edge.id) ? [] : { type: "edge/remove", edgeId: edge.id },
  );

const diffNodeRemovals = (
  previousNodes: readonly RenderNode[],
  nextNodesById: ReadonlyMap<RenderNode["id"], RenderNode>,
): RenderCommandBatch =>
  previousNodes.flatMap<RenderCommand>((node) =>
    nextNodesById.has(node.id) ? [] : { type: "node/remove", nodeId: node.id },
  );

export type SceneDiff = RenderCommandBatch;

// Scene diffing is renderer-facing rather than app-facing, so it only emits
// commands when a node or edge's rendered semantics change. Scene-level
// selection ordering changes with identical per-element selection state do not
// produce commands.
export const diffScene = (previous: RenderScene | undefined, next: RenderScene): SceneDiff => {
  if (previous === undefined) {
    return [
      ...next.nodes.map<RenderCommand>((node) => ({ type: "node/add", node })),
      ...next.edges.map<RenderCommand>((edge) => ({ type: "edge/add", edge })),
    ];
  }

  const previousNodesById = buildNodeById(previous.nodes);
  const previousEdgesById = buildEdgeById(previous.edges);
  const nextNodesById = buildNodeById(next.nodes);
  const nextEdgesById = buildEdgeById(next.edges);

  return [
    ...diffEdgeRemovals(previous.edges, nextEdgesById),
    ...diffNodeRemovals(previous.nodes, nextNodesById),
    ...diffNodeAddsAndUpdates(previousNodesById, next.nodes),
    ...diffEdgeAddsAndUpdates(previousEdgesById, next.edges),
  ];
};
