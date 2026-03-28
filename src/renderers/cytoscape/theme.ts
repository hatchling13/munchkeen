import type cytoscape from "cytoscape";

export type CytoscapeStylesheetRule = {
  readonly selector: string;
  readonly style: Readonly<Record<string, string | number>>;
};

const DEFAULT_CYTOSCAPE_STYLESHEET: readonly CytoscapeStylesheetRule[] = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "background-color": "data(color)",
      "text-valign": "center",
      "text-halign": "center",
      "border-width": 0,
    },
  },
  {
    selector: "edge",
    style: {
      label: "data(label)",
      "line-color": "data(color)",
      "target-arrow-color": "data(color)",
      "target-arrow-shape": "none",
      "curve-style": "bezier",
      width: 2,
    },
  },
  {
    selector: ".mk-focused",
    style: {
      "border-width": 3,
      "border-color": "#f59e0b",
    },
  },
  {
    selector: ".mk-directed",
    style: {
      "target-arrow-shape": "triangle",
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": "#2563eb",
    },
  },
  {
    selector: "edge:selected",
    style: {
      width: 4,
      "line-color": "#2563eb",
      "target-arrow-color": "#2563eb",
    },
  },
];

export const createCytoscapeStylesheet = (
  overrides: readonly CytoscapeStylesheetRule[] = [],
): readonly CytoscapeStylesheetRule[] => [...DEFAULT_CYTOSCAPE_STYLESHEET, ...overrides];

export const toCytoscapeStylesheetJson = (
  rules: readonly CytoscapeStylesheetRule[],
): cytoscape.StylesheetStyle[] =>
  rules.map((rule) => ({
    selector: rule.selector,
    style: rule.style as cytoscape.Css.Node | cytoscape.Css.Edge | cytoscape.Css.Core,
  }));
