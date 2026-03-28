import type cytoscape from "cytoscape";

import { mapFromEntries } from "../../core/collections";
import { left, right, type Either } from "../../core/either";
import type { RenderCommand, RenderCommandBatch } from "../../core/commands";
import type { LayoutPosition } from "../../core/layout";
import { nodeId, type NodeId } from "../../core/model";
import {
  toCytoscapeEdgeElement,
  toCytoscapeNodeElement,
} from "./elements";
import {
  describeCytoscapeFrameBudget,
  type CytoscapeFrameBudgetReport,
} from "./performance";

export type CytoscapeRendererErrorCode =
  | "cytoscape_create_failed"
  | "cytoscape_attach_failed"
  | "cytoscape_apply_failed"
  | "cytoscape_missing_element"
  | "cytoscape_style_failed"
  | "cytoscape_native_layout_failed";

export type CytoscapeRendererError = {
  readonly code: CytoscapeRendererErrorCode;
  readonly message: string;
  readonly cause?: unknown;
  readonly commandType?: RenderCommand["type"];
  readonly elementId?: string;
};

export type CytoscapeNow = () => number;

export type CytoscapeCommandApplyResult = {
  readonly durationMs: number;
  readonly commandCount: number;
  readonly frameBudget: CytoscapeFrameBudgetReport;
};

export type CytoscapeNativeLayoutRequest = {
  readonly name: string;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly onPositions?: (positions: ReadonlyMap<NodeId, LayoutPosition>) => void;
};

export type CytoscapeNativeLayoutResult = {
  readonly durationMs: number;
  readonly positions: ReadonlyMap<NodeId, LayoutPosition>;
  readonly frameBudget: CytoscapeFrameBudgetReport;
};

export type CytoscapeCommandInterpreter = {
  readonly kind: "cytoscape-interpreter";
  readonly apply: (
    commands: RenderCommandBatch,
  ) => Either<CytoscapeRendererError, CytoscapeCommandApplyResult>;
};

const INITIAL_VIEWPORT_PADDING = 48;
const defaultNow = (): number => globalThis.performance?.now() ?? Date.now();

const getNow = (now: CytoscapeNow | undefined): CytoscapeNow => now ?? defaultNow;

const buildMissingElementError = (
  command: RenderCommand,
  elementId: string,
): CytoscapeRendererError => ({
  code: "cytoscape_missing_element",
  message: `Cytoscape element "${elementId}" does not exist for command "${command.type}"`,
  commandType: command.type,
  elementId,
});

const captureCytoscapeNodePositions = (
  cy: cytoscape.Core,
): ReadonlyMap<NodeId, LayoutPosition> =>
  mapFromEntries(
    cy.nodes().toArray().map((node) => [
      nodeId(node.id()),
      {
        x: node.position("x"),
        y: node.position("y"),
      },
    ] as const),
  );

const fitInitialViewport = (cy: cytoscape.Core): void => {
  if (cy.elements().length === 0) {
    return;
  }

  try {
    cy.fit(cy.elements(), INITIAL_VIEWPORT_PADDING);
  } catch {
    // Initial viewport fitting is a renderer-specific convenience and should
    // never turn an otherwise valid command batch into a hard failure.
  }
};

const interpretCommand = (
  cy: cytoscape.Core,
  command: RenderCommand,
): CytoscapeRendererError | undefined => {
  switch (command.type) {
    case "node/add":
      cy.add(toCytoscapeNodeElement(command.node));
      return undefined;

    case "node/update": {
      const element = cy.getElementById(command.node.id);

      if (element.length === 0) {
        return buildMissingElementError(command, command.node.id);
      }

      element.json(toCytoscapeNodeElement(command.node));
      return undefined;
    }

    case "node/remove": {
      const element = cy.getElementById(command.nodeId);

      if (element.length === 0) {
        return buildMissingElementError(command, command.nodeId);
      }

      element.remove();
      return undefined;
    }

    case "edge/add":
      cy.add(toCytoscapeEdgeElement(command.edge));
      return undefined;

    case "edge/update": {
      const element = cy.getElementById(command.edge.id);

      if (element.length === 0) {
        return buildMissingElementError(command, command.edge.id);
      }

      element.json(toCytoscapeEdgeElement(command.edge));
      return undefined;
    }

    case "edge/remove": {
      const element = cy.getElementById(command.edgeId);

      if (element.length === 0) {
        return buildMissingElementError(command, command.edgeId);
      }

      element.remove();
      return undefined;
    }
  }
};

export const createCytoscapeCommandInterpreter = ({
  cy,
  now,
}: {
  readonly cy: cytoscape.Core;
  readonly now?: CytoscapeNow;
}): CytoscapeCommandInterpreter => ({
  kind: "cytoscape-interpreter",
  apply: (commands) => {
    const readNow = getNow(now);
    const startedAt = readNow();
    const hadElements = cy.elements().length > 0;
    let failure: CytoscapeRendererError | undefined;

    try {
      cy.batch(() => {
        for (const command of commands) {
          if (failure !== undefined) {
            break;
          }

          failure = interpretCommand(cy, command);
        }
      });
    } catch (cause) {
      return left({
        code: "cytoscape_apply_failed",
        message: "Failed to apply Cytoscape render commands",
        cause,
      });
    }

    if (failure !== undefined) {
      return left(failure);
    }

    if (!hadElements && cy.elements().length > 0) {
      fitInitialViewport(cy);
    }

    const durationMs = readNow() - startedAt;

    return right({
      durationMs,
      commandCount: commands.length,
      frameBudget: describeCytoscapeFrameBudget(durationMs),
    });
  },
});

export const runCytoscapeNativeLayout = ({
  cy,
  layout,
  now,
}: {
  readonly cy: cytoscape.Core;
  readonly layout: CytoscapeNativeLayoutRequest;
  readonly now?: CytoscapeNow;
}): Either<CytoscapeRendererError, CytoscapeNativeLayoutResult> => {
  const readNow = getNow(now);
  const startedAt = readNow();

  try {
    cy
      .layout({
        name: layout.name,
        ...(layout.options ?? {}),
      } as cytoscape.LayoutOptions)
      .run();

    const positions = captureCytoscapeNodePositions(cy);
    const durationMs = readNow() - startedAt;

    layout.onPositions?.(positions);

    return right({
      durationMs,
      positions,
      frameBudget: describeCytoscapeFrameBudget(durationMs),
    });
  } catch (cause) {
    return left({
      code: "cytoscape_native_layout_failed",
      message: `Failed to run Cytoscape native layout "${layout.name}"`,
      cause,
    });
  }
};
