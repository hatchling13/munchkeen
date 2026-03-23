import type { EdgeId, NodeId } from "./model";

export type Dispose = () => void;

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
