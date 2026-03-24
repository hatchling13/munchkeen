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

export type GraphRenderer = {
  readonly kind: string;
};
