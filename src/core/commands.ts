import type { EdgeId, NodeId } from "./model";
import type { RenderEdge, RenderNode } from "./scene";

export type AddNodeRenderCommand = {
  readonly type: "node/add";
  readonly node: RenderNode;
};

export type UpdateNodeRenderCommand = {
  readonly type: "node/update";
  readonly node: RenderNode;
};

export type RemoveNodeRenderCommand = {
  readonly type: "node/remove";
  readonly nodeId: NodeId;
};

export type AddEdgeRenderCommand = {
  readonly type: "edge/add";
  readonly edge: RenderEdge;
};

export type UpdateEdgeRenderCommand = {
  readonly type: "edge/update";
  readonly edge: RenderEdge;
};

export type RemoveEdgeRenderCommand = {
  readonly type: "edge/remove";
  readonly edgeId: EdgeId;
};

export type RenderCommand =
  | AddNodeRenderCommand
  | UpdateNodeRenderCommand
  | RemoveNodeRenderCommand
  | AddEdgeRenderCommand
  | UpdateEdgeRenderCommand
  | RemoveEdgeRenderCommand;

export type RenderCommandBatch = readonly RenderCommand[];
