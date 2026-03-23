import type { GraphData } from "./model";

export type GraphValidationError = {
  readonly code: string;
  readonly message: string;
};

export type ValidatedGraph<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly _tag: "ValidatedGraph";
  readonly graph: GraphData<NodeData, EdgeData, NodeKind, EdgeKind>;
};
