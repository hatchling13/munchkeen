import type { EdgeId, NodeId } from "./model";

// Cleanup function returned by boundary-level subscriptions or effects.
export type Dispose = () => void;

// Minimal subscription handle used at effect boundaries.
export type Subscription = {
  readonly unsubscribe: Dispose;
};

export type GraphSelection = {
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
};

export type GraphRendererEvent =
  | {
      readonly type: "node/activate";
      readonly nodeId: NodeId;
    }
  | {
      readonly type: "selection/change";
      readonly selection: GraphSelection;
    };

export type GraphRendererCreateSessionOptions = {
  readonly onEvent?: (event: GraphRendererEvent) => void;
} & Readonly<Record<string, unknown>>;

export interface GraphRenderer {
  readonly kind: string;
  readonly createSession: (options?: GraphRendererCreateSessionOptions) => unknown;
}
