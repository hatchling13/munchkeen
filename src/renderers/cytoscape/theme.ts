export type CytoscapeStylesheetRule = {
  readonly selector: string;
  readonly style: Readonly<Record<string, string | number>>;
};
