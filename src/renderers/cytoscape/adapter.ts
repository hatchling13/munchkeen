import cytoscape from "cytoscape";

import type {
  Dispose,
  GraphRenderer,
  GraphRendererCreateSessionOptions,
} from "../../core/api";
import { left, right, type Either } from "../../core/either";
import type { RenderCommandBatch } from "../../core/commands";
import {
  bindCytoscapeEvents,
  type CytoscapeRendererEvent,
} from "./events";
import {
  createCytoscapeCommandInterpreter,
  runCytoscapeNativeLayout,
  type CytoscapeCommandApplyResult,
  type CytoscapeCommandInterpreter,
  type CytoscapeNativeLayoutRequest,
  type CytoscapeNativeLayoutResult,
  type CytoscapeNow,
  type CytoscapeRendererError,
} from "./interpreter";
import {
  createCytoscapeStylesheet,
  toCytoscapeStylesheetJson,
  type CytoscapeStylesheetRule,
} from "./theme";

export type CytoscapeRendererCreateSessionOptions = GraphRendererCreateSessionOptions & {
  readonly headless?: boolean;
  readonly styleEnabled?: boolean;
  readonly stylesheet?: readonly CytoscapeStylesheetRule[];
  readonly onEvent?: (event: CytoscapeRendererEvent) => void;
  readonly now?: CytoscapeNow;
};

export type CytoscapeRendererAttachOptions = {
  readonly container: Element;
};

export type CytoscapeRendererSession = {
  readonly cy: cytoscape.Core;
  readonly interpreter: CytoscapeCommandInterpreter;
  readonly attach: (
    options: CytoscapeRendererAttachOptions,
  ) => Either<CytoscapeRendererError, void>;
  readonly detach: () => void;
  readonly applyCommands: (
    commands: RenderCommandBatch,
  ) => Either<CytoscapeRendererError, CytoscapeCommandApplyResult>;
  readonly updateStylesheet: (
    stylesheet?: readonly CytoscapeStylesheetRule[],
  ) => Either<CytoscapeRendererError, readonly CytoscapeStylesheetRule[]>;
  readonly runNativeLayout: (
    layout: CytoscapeNativeLayoutRequest,
  ) => Either<CytoscapeRendererError, CytoscapeNativeLayoutResult>;
  readonly dispose: Dispose;
};

export interface CytoscapeRenderer extends GraphRenderer {
  readonly kind: "cytoscape";
  readonly createSession: (
    options?: CytoscapeRendererCreateSessionOptions,
  ) => Either<CytoscapeRendererError, CytoscapeRendererSession>;
}

const buildCreateError = (cause: unknown): CytoscapeRendererError => ({
  code: "cytoscape_create_failed",
  message: "Failed to create Cytoscape renderer instance",
  cause,
});

const buildStyleError = (cause: unknown): CytoscapeRendererError => ({
  code: "cytoscape_style_failed",
  message: "Failed to apply Cytoscape stylesheet rules",
  cause,
});

const buildAttachError = (cause: unknown): CytoscapeRendererError => ({
  code: "cytoscape_attach_failed",
  message: "Failed to attach Cytoscape renderer session to a DOM container",
  cause,
});

const createCytoscapeCore = (
  options: CytoscapeRendererCreateSessionOptions,
): Either<CytoscapeRendererError, cytoscape.Core> => {
  try {
    return right(
      cytoscape({
        headless: options.headless ?? true,
        styleEnabled: options.styleEnabled ?? true,
        style: toCytoscapeStylesheetJson(
          createCytoscapeStylesheet(options.stylesheet),
        ),
        elements: [],
      }),
    );
  } catch (cause) {
    return left(buildCreateError(cause));
  }
};

const updateCytoscapeStylesheet = ({
  cy,
  stylesheet,
}: {
  readonly cy: cytoscape.Core;
  readonly stylesheet?: readonly CytoscapeStylesheetRule[];
}): Either<CytoscapeRendererError, readonly CytoscapeStylesheetRule[]> => {
  const resolvedStylesheet = createCytoscapeStylesheet(stylesheet);

  try {
    cy.style(toCytoscapeStylesheetJson(resolvedStylesheet));

    return right(resolvedStylesheet);
  } catch (cause) {
    return left(buildStyleError(cause));
  }
};

const attachCytoscapeCore = ({
  cy,
  container,
}: {
  readonly cy: cytoscape.Core;
  readonly container: Element;
}): Either<CytoscapeRendererError, void> => {
  try {
    cy.mount(container);

    return right(undefined);
  } catch (cause) {
    return left(buildAttachError(cause));
  }
};

export const createCytoscapeRenderer = (): CytoscapeRenderer => ({
  kind: "cytoscape",
  createSession: (options = {}) => {
    const core = createCytoscapeCore(options);

    if (core._tag === "Left") {
      return left(core.left);
    }

    const cy = core.right;
    const subscription = bindCytoscapeEvents({
      cy,
      onEvent: options.onEvent,
    });
    const interpreter = createCytoscapeCommandInterpreter({
      cy,
      now: options.now,
    });
    const session: CytoscapeRendererSession = {
      cy,
      interpreter,
      attach: ({ container }) =>
        attachCytoscapeCore({
          cy,
          container,
        }),
      detach: () => {
        cy.unmount();
      },
      applyCommands: (commands) => interpreter.apply(commands),
      updateStylesheet: (stylesheet) =>
        updateCytoscapeStylesheet({
          cy,
          stylesheet,
        }),
      runNativeLayout: (layout) =>
        runCytoscapeNativeLayout({
          cy,
          layout,
          now: options.now,
        }),
      dispose: () => {
        subscription.unsubscribe();
        cy.destroy();
      },
    };

    return right(session);
  },
});
