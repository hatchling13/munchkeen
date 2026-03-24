import { dedupe } from "./collections";
import type { EdgeId, GraphNeighborhood, GraphView, NodeId } from "./model";

type GraphTransitionSelectionSet = {
  readonly type: "selection/set";
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
};

type GraphTransitionSelectionClear = {
  readonly type: "selection/clear";
};

type GraphTransitionFocusSet = {
  readonly type: "focus/set";
  readonly focus: NodeId | null;
};

type GraphTransitionNeighborhoodExpand = {
  readonly type: "neighborhood/expand";
  readonly focus: NodeId;
  // Transitions carry intended radius values; projection remains responsible
  // for validating the concrete hop-count semantics of that number.
  readonly radius: GraphNeighborhood["radius"];
  readonly direction?: GraphNeighborhood["direction"];
};

type GraphTransitionNeighborhoodCollapse = {
  readonly type: "neighborhood/collapse";
};

type GraphTransitionHideNodes = {
  readonly type: "visibility/hide-nodes";
  readonly nodeIds: readonly NodeId[];
};

type GraphTransitionShowNodes = {
  readonly type: "visibility/show-nodes";
  readonly nodeIds: readonly NodeId[];
};

type GraphTransitionHideEdges = {
  readonly type: "visibility/hide-edges";
  readonly edgeIds: readonly EdgeId[];
};

type GraphTransitionShowEdges = {
  readonly type: "visibility/show-edges";
  readonly edgeIds: readonly EdgeId[];
};

export type GraphTransition =
  | GraphTransitionSelectionSet
  | GraphTransitionSelectionClear
  | GraphTransitionFocusSet
  | GraphTransitionNeighborhoodExpand
  | GraphTransitionNeighborhoodCollapse
  | GraphTransitionHideNodes
  | GraphTransitionShowNodes
  | GraphTransitionHideEdges
  | GraphTransitionShowEdges;

const toOptionalList = <A>(values: readonly A[]): readonly A[] | undefined =>
  values.length > 0 ? values : undefined;

const mergeUnique = <A>(
  currentValues: readonly A[] | undefined,
  nextValues: readonly A[],
): readonly A[] | undefined => toOptionalList(dedupe([...(currentValues ?? []), ...nextValues]));

const removeValues = <A>(
  currentValues: readonly A[] | undefined,
  valuesToRemove: readonly A[],
): readonly A[] | undefined => {
  if (!currentValues) {
    return undefined;
  }

  const uniqueValuesToRemove = dedupe(valuesToRemove);

  return toOptionalList(currentValues.filter((value) => !uniqueValuesToRemove.includes(value)));
};

const withFocus = (view: GraphView, focus: NodeId | null): GraphView =>
  focus === null
    ? {
        ...view,
        focus: null,
        neighborhood: undefined,
      }
    : {
        ...view,
        focus,
      };

// Raw pan/zoom/viewport coordinates stay renderer-local in v1. Transitions only
// carry semantic intent that the core can model as pure GraphView updates.
export const applyGraphTransition = (
  view: GraphView | undefined,
  transition: GraphTransition,
): GraphView => {
  const currentView: GraphView = view ?? {};

  // Keep the reducer as an explicit switch for now so the current transition
  // algebra stays easy to scan and exhaustiveness remains obvious as it grows.
  // If Step 4's transition set expands materially later, prefer splitting the
  // union and reducer by domain (focus/selection/visibility/...) before moving
  // to a handler-map style abstraction.
  switch (transition.type) {
    case "selection/set":
      return {
        ...currentView,
        selectedNodeIds: toOptionalList(dedupe(transition.nodeIds)),
        selectedEdgeIds: toOptionalList(dedupe(transition.edgeIds)),
      };

    case "selection/clear":
      return {
        ...currentView,
        selectedNodeIds: undefined,
        selectedEdgeIds: undefined,
      };

    case "focus/set":
      return withFocus(currentView, transition.focus);

    case "neighborhood/expand":
      return {
        ...currentView,
        focus: transition.focus,
        neighborhood: {
          radius: transition.radius,
          direction: transition.direction,
        },
      };

    case "neighborhood/collapse":
      return {
        ...currentView,
        neighborhood: undefined,
      };

    case "visibility/hide-nodes":
      return {
        ...currentView,
        hiddenNodeIds: mergeUnique(currentView.hiddenNodeIds, transition.nodeIds),
      };

    case "visibility/show-nodes":
      return {
        ...currentView,
        hiddenNodeIds: removeValues(currentView.hiddenNodeIds, transition.nodeIds),
      };

    case "visibility/hide-edges":
      return {
        ...currentView,
        hiddenEdgeIds: mergeUnique(currentView.hiddenEdgeIds, transition.edgeIds),
      };

    case "visibility/show-edges":
      return {
        ...currentView,
        hiddenEdgeIds: removeValues(currentView.hiddenEdgeIds, transition.edgeIds),
      };
  }
};

export const applyGraphTransitions = (
  view: GraphView | undefined,
  transitions: readonly GraphTransition[],
): GraphView =>
  transitions.reduce(
    (currentView, transition) => applyGraphTransition(currentView, transition),
    view ?? {},
  );
