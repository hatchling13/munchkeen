import { nodeId, type GraphView } from "../src/core/model";
import type { GraphTransition } from "../src/core/transitions";

const focusedView: GraphView = {
  focus: nodeId("alpha"),
  neighborhood: {
    radius: 2,
    direction: "both",
  },
};

const unfocusedView: GraphView = {
  focus: null,
};

void focusedView;
void unfocusedView;

// @ts-expect-error neighborhood exploration requires a concrete focused node.
const invalidViewWithoutFocus: GraphView = {
  neighborhood: {
    radius: 1,
  },
};

void invalidViewWithoutFocus;

// @ts-expect-error neighborhood exploration cannot coexist with a null focus.
const invalidViewWithNullFocus: GraphView = {
  focus: null,
  neighborhood: {
    radius: 1,
  },
};

void invalidViewWithNullFocus;

const invalidViewportTransition: GraphTransition = {
  // @ts-expect-error raw viewport pan/zoom stays renderer-local instead of entering GraphTransition.
  type: "viewport/set",
  x: 10,
  y: 20,
  zoom: 2,
};

void invalidViewportTransition;
