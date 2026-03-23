import type { EdgeId, NodeId } from "./model";

export type ProjectedGraph = {
  readonly _tag: "ProjectedGraph";
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
};
