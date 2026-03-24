import { dedupe, mapFromEntries } from "./collections";
import { left, right, type Either } from "./either";
import { isJust } from "./maybe";
import type { NodeId } from "./model";
import type { ProjectedGraph } from "./project";
import { fromReadonlyArray, type ReadonlyNonEmptyArray } from "./readonly-non-empty-array";

export type LayoutPosition = {
  readonly x: number;
  readonly y: number;
};

export type PresetLayoutSpec = {
  readonly kind: "preset";
  readonly positions: ReadonlyMap<NodeId, LayoutPosition>;
};

export type RadialLayoutSpec = {
  readonly kind: "radial";
  readonly root?: NodeId;
  readonly center?: LayoutPosition;
};

export type BreadthfirstLayoutSpec = {
  readonly kind: "breadthfirst";
  readonly root?: NodeId;
  readonly direction?: "top-to-bottom" | "left-to-right";
};

// Core layout contracts stay renderer-agnostic and intentionally exclude
// renderer-native layouts such as dagre or fcose. Those remain adapter-level.
export type LayoutSpec = PresetLayoutSpec | RadialLayoutSpec | BreadthfirstLayoutSpec;

export type MissingPresetPositionLayoutError = {
  readonly code: "missing_preset_position";
  readonly message: string;
  readonly nodeIds: ReadonlyNonEmptyArray<NodeId>;
};

export type MissingLayoutRootLayoutError = {
  readonly code: "missing_layout_root";
  readonly message: string;
  readonly kind: RadialLayoutSpec["kind"] | BreadthfirstLayoutSpec["kind"];
  readonly root: NodeId;
};

export type LayoutError = MissingPresetPositionLayoutError | MissingLayoutRootLayoutError;

export type RunLayoutInput<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly graph: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>;
  readonly layout?: LayoutSpec;
};

const laidOutGraphSymbol: unique symbol = Symbol("LaidOutGraph");

export type LaidOutGraph<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly _tag: "LaidOutGraph";
  readonly [laidOutGraphSymbol]: true;
  readonly nodes: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>["nodes"];
  readonly edges: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>["edges"];
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>["edgeIds"];
  readonly nodeById: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>["nodeById"];
  readonly edgeById: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>["edgeById"];
  readonly positions: ReadonlyMap<NodeId, LayoutPosition>;
};

const DEFAULT_LAYOUT_SPEC: BreadthfirstLayoutSpec = {
  kind: "breadthfirst",
};

const DEFAULT_RADIAL_CENTER: LayoutPosition = {
  x: 0,
  y: 0,
};

// Step 6 keeps these as deterministic default spacings rather than claiming
// visually optimal values. Later steps may expose them through LayoutSpec or
// derive better heuristics from richer inputs such as node footprint, label
// size, or viewport constraints.
const RADIAL_RING_RADIUS = 160;
const BREADTHFIRST_NODE_GAP = 180;
const BREADTHFIRST_LEVEL_GAP = 140;

const buildLaidOutGraph = <NodeData, EdgeData, NodeKind extends string, EdgeKind extends string>(
  graph: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  positions: ReadonlyMap<NodeId, LayoutPosition>,
): LaidOutGraph<NodeData, EdgeData, NodeKind, EdgeKind> => ({
  _tag: "LaidOutGraph",
  [laidOutGraphSymbol]: true,
  nodes: graph.nodes,
  edges: graph.edges,
  nodeIds: graph.nodeIds,
  edgeIds: graph.edgeIds,
  nodeById: graph.nodeById,
  edgeById: graph.edgeById,
  positions,
});

const resolveLayoutRoot = <NodeData, EdgeData, NodeKind extends string, EdgeKind extends string>(
  graph: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  kind: MissingLayoutRootLayoutError["kind"],
  root: NodeId | undefined,
): Either<MissingLayoutRootLayoutError, NodeId | undefined> => {
  if (root !== undefined && !graph.nodeById.has(root)) {
    return left({
      code: "missing_layout_root",
      message: `Layout root "${root}" does not exist in the projected graph`,
      kind,
      root,
    });
  }

  return right(root ?? graph.nodeIds[0]);
};

const orderPositions = (
  nodeIds: readonly NodeId[],
  positionsByNodeId: ReadonlyMap<NodeId, LayoutPosition>,
): ReadonlyMap<NodeId, LayoutPosition> =>
  mapFromEntries(
    nodeIds.flatMap((nodeId) => {
      const position = positionsByNodeId.get(nodeId);

      return position === undefined ? [] : [[nodeId, position] as const];
    }),
  );

const runPresetLayout = <NodeData, EdgeData, NodeKind extends string, EdgeKind extends string>(
  graph: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  layout: PresetLayoutSpec,
): Either<LayoutError, LaidOutGraph<NodeData, EdgeData, NodeKind, EdgeKind>> => {
  const missingNodeIds = graph.nodeIds.filter((nodeId) => !layout.positions.has(nodeId));
  const missingPositions = fromReadonlyArray(missingNodeIds);

  if (isJust(missingPositions)) {
    return left({
      code: "missing_preset_position",
      message: "Preset layout requires positions for every projected node",
      nodeIds: missingPositions.value,
    });
  }

  const positions = mapFromEntries(
    graph.nodeIds.flatMap((nodeId) => {
      const position = layout.positions.get(nodeId);

      return position === undefined ? [] : [[nodeId, position] as const];
    }),
  );

  return right(buildLaidOutGraph(graph, positions));
};

const runRadialLayout = <NodeData, EdgeData, NodeKind extends string, EdgeKind extends string>(
  graph: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  layout: RadialLayoutSpec,
): Either<LayoutError, LaidOutGraph<NodeData, EdgeData, NodeKind, EdgeKind>> => {
  const resolvedRoot = resolveLayoutRoot(graph, "radial", layout.root);

  if (resolvedRoot._tag === "Left") {
    return left(resolvedRoot.left);
  }

  const centerNodeId = resolvedRoot.right;
  const center = layout.center ?? DEFAULT_RADIAL_CENTER;

  if (centerNodeId === undefined) {
    return right(buildLaidOutGraph(graph, mapFromEntries([])));
  }

  const outerNodeIds = graph.nodeIds.filter((nodeId) => nodeId !== centerNodeId);
  const generatedPositions = mapFromEntries([
    [centerNodeId, center] as const,
    ...outerNodeIds.map((nodeId, index) => {
      const angle = -Math.PI / 2 + (index * (2 * Math.PI)) / outerNodeIds.length;

      return [
        nodeId,
        {
          x: center.x + Math.cos(angle) * RADIAL_RING_RADIUS,
          y: center.y + Math.sin(angle) * RADIAL_RING_RADIUS,
        },
      ] as const;
    }),
  ]);

  return right(buildLaidOutGraph(graph, orderPositions(graph.nodeIds, generatedPositions)));
};

const buildNeighborIdsByNodeId = <
  NodeData,
  EdgeData,
  NodeKind extends string,
  EdgeKind extends string,
>(
  graph: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
): ReadonlyMap<NodeId, readonly NodeId[]> =>
  mapFromEntries(
    graph.nodeIds.map(
      (nodeId) =>
        [
          nodeId,
          dedupe(
            graph.edges.flatMap((edge) => {
              if (edge.source === nodeId) {
                return [edge.target];
              }

              if (edge.target === nodeId) {
                return [edge.source];
              }

              return [];
            }),
          ),
        ] as const,
    ),
  );

const expandComponentLevels = (
  neighborIdsByNodeId: ReadonlyMap<NodeId, readonly NodeId[]>,
  state: {
    readonly levels: ReadonlyMap<NodeId, number>;
    readonly frontierNodeIds: readonly NodeId[];
    readonly currentLevel: number;
  },
): ReadonlyMap<NodeId, number> => {
  const nextNodeIds = dedupe(
    state.frontierNodeIds.flatMap((nodeId) =>
      (neighborIdsByNodeId.get(nodeId) ?? []).filter((neighborId) => !state.levels.has(neighborId)),
    ),
  );

  if (nextNodeIds.length === 0) {
    return state.levels;
  }

  const nextLevel = state.currentLevel + 1;

  return expandComponentLevels(neighborIdsByNodeId, {
    currentLevel: nextLevel,
    frontierNodeIds: nextNodeIds,
    levels: mapFromEntries([
      ...state.levels,
      ...nextNodeIds.map((nodeId) => [nodeId, nextLevel] as const),
    ]),
  });
};

const buildBreadthfirstLevels = <
  NodeData,
  EdgeData,
  NodeKind extends string,
  EdgeKind extends string,
>(
  graph: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  root: NodeId | undefined,
): ReadonlyMap<NodeId, number> => {
  const neighborIdsByNodeId = buildNeighborIdsByNodeId(graph);
  const candidateRootIds =
    root === undefined
      ? graph.nodeIds
      : [root, ...graph.nodeIds.filter((nodeId) => nodeId !== root)];

  return candidateRootIds.reduce<{
    readonly levels: ReadonlyMap<NodeId, number>;
    readonly nextBaseLevel: number;
  }>(
    (state, candidateRootId) => {
      if (state.levels.has(candidateRootId)) {
        return state;
      }

      const componentLevels = expandComponentLevels(neighborIdsByNodeId, {
        currentLevel: state.nextBaseLevel,
        frontierNodeIds: [candidateRootId],
        levels: mapFromEntries([[candidateRootId, state.nextBaseLevel] as const]),
      });
      const highestComponentLevel = Math.max(...componentLevels.values());

      return {
        levels: mapFromEntries([...state.levels, ...componentLevels]),
        nextBaseLevel: highestComponentLevel + 1,
      };
    },
    {
      levels: mapFromEntries([]),
      nextBaseLevel: 0,
    },
  ).levels;
};

const runBreadthfirstLayout = <
  NodeData,
  EdgeData,
  NodeKind extends string,
  EdgeKind extends string,
>(
  graph: ProjectedGraph<NodeData, EdgeData, NodeKind, EdgeKind>,
  layout: BreadthfirstLayoutSpec,
): Either<LayoutError, LaidOutGraph<NodeData, EdgeData, NodeKind, EdgeKind>> => {
  const resolvedRoot = resolveLayoutRoot(graph, "breadthfirst", layout.root);

  if (resolvedRoot._tag === "Left") {
    return left(resolvedRoot.left);
  }

  const levels = buildBreadthfirstLevels(graph, resolvedRoot.right);
  const sortedLevels = dedupe(graph.nodeIds.map((nodeId) => levels.get(nodeId) ?? 0)).toSorted(
    (leftLevel, rightLevel) => leftLevel - rightLevel,
  );
  const generatedPositions = mapFromEntries(
    sortedLevels.flatMap((level) => {
      const levelNodeIds = graph.nodeIds.filter((nodeId) => (levels.get(nodeId) ?? 0) === level);
      const minorAxisOffset = ((levelNodeIds.length - 1) * BREADTHFIRST_NODE_GAP) / 2;

      return levelNodeIds.map((nodeId, index) => {
        const minorAxis = index * BREADTHFIRST_NODE_GAP - minorAxisOffset;
        const majorAxis = level * BREADTHFIRST_LEVEL_GAP;

        return [
          nodeId,
          layout.direction === "left-to-right"
            ? { x: majorAxis, y: minorAxis }
            : { x: minorAxis, y: majorAxis },
        ] as const;
      });
    }),
  );

  return right(buildLaidOutGraph(graph, orderPositions(graph.nodeIds, generatedPositions)));
};

export const runLayout = <
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
>({
  graph,
  layout = DEFAULT_LAYOUT_SPEC,
}: RunLayoutInput<NodeData, EdgeData, NodeKind, EdgeKind>): Either<
  LayoutError,
  LaidOutGraph<NodeData, EdgeData, NodeKind, EdgeKind>
> => {
  switch (layout.kind) {
    case "preset":
      return runPresetLayout(graph, layout);
    case "radial":
      return runRadialLayout(graph, layout);
    case "breadthfirst":
      return runBreadthfirstLayout(graph, layout);
  }
};
