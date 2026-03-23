import type { JSX } from "solid-js";

import type { GraphRenderer, GraphSelection } from "../core/api";
import type { LayoutSpec } from "../core/layout";
import type { GraphData, GraphNode, GraphView } from "../core/model";
import type { GraphTheme } from "../core/theme";

export type GraphProps<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly graph: GraphData<NodeData, EdgeData, NodeKind, EdgeKind>;
  readonly view?: GraphView;
  readonly layout?: LayoutSpec;
  readonly theme?: GraphTheme;
  readonly renderer?: GraphRenderer;
  readonly class?: string;
  readonly fallback?: JSX.Element;
  readonly onNodeActivate?: (node: GraphNode<NodeData, NodeKind>) => void;
  readonly onSelectionChange?: (selection: GraphSelection) => void;
};

export const Graph = <
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
>(
  props: GraphProps<NodeData, EdgeData, NodeKind, EdgeKind>,
): JSX.Element => {
  return (
    <div
      class={props.class}
      data-munchkeen-graph=""
      data-renderer={props.renderer?.kind ?? "unconfigured"}
      data-node-count={String(props.graph.nodes.length)}
      data-edge-count={String(props.graph.edges.length)}
    >
      {props.fallback ?? null}
    </div>
  );
};
