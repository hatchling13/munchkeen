import type { GraphRenderer } from "../../core/api";

export type CytoscapeRenderer = GraphRenderer & {
  readonly kind: "cytoscape";
};

export const createCytoscapeRenderer = (): CytoscapeRenderer => ({
  kind: "cytoscape",
});
