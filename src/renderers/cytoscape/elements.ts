export type CytoscapeElement = {
  readonly group: "nodes" | "edges";
  readonly data: Readonly<Record<string, unknown>>;
};
