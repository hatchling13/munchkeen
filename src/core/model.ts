import type { Brand } from "./brand";

export type NodeId = Brand<string, "NodeId">;
export type EdgeId = Brand<string, "EdgeId">;

export type GraphNode<NodeData = unknown, NodeKind extends string = string> = {
  readonly id: NodeId;
  readonly kind?: NodeKind;
  readonly label?: string;
  readonly data?: NodeData;
};

export type GraphEdge<EdgeData = unknown, EdgeKind extends string = string> = {
  readonly id: EdgeId;
  readonly source: NodeId;
  readonly target: NodeId;
  readonly kind?: EdgeKind;
  readonly label?: string;
  readonly directed?: boolean;
  readonly data?: EdgeData;
};

export type GraphData<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly nodes: readonly GraphNode<NodeData, NodeKind>[];
  readonly edges: readonly GraphEdge<EdgeData, EdgeKind>[];
};

export type GraphDataInput<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = GraphData<NodeData, EdgeData, NodeKind, EdgeKind>;

export type GraphView = {
  readonly focus?: NodeId | null;
  readonly selectedNodeIds?: readonly NodeId[];
  readonly selectedEdgeIds?: readonly EdgeId[];
  readonly neighborhood?: {
    readonly radius: number;
    readonly direction?: "in" | "out" | "both";
  };
  readonly hiddenNodeIds?: readonly NodeId[];
  readonly hiddenEdgeIds?: readonly EdgeId[];
};
