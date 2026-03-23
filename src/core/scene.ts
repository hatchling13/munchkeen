import type { GraphSelection } from "./api";

export type RenderNode = {
  readonly id: string;
  readonly classNames: readonly string[];
  readonly label?: string;
};

export type RenderEdge = {
  readonly id: string;
  readonly classNames: readonly string[];
  readonly label?: string;
};

export type RenderScene = {
  readonly _tag: "RenderScene";
  readonly nodes: readonly RenderNode[];
  readonly edges: readonly RenderEdge[];
  readonly selection?: GraphSelection;
};
