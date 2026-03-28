import { describe, expect, it } from "vitest";

import { isLeft, isRight } from "../src/core/either";
import { edgeId, nodeId } from "../src/core/model";
import type { RenderEdge, RenderNode } from "../src/core/scene";
import {
  createCytoscapeRenderer,
  createCytoscapeStylesheet,
} from "../src/renderers/cytoscape";

const makeNode = (
  id: ReturnType<typeof nodeId>,
  overrides: Partial<RenderNode> = {},
): RenderNode => ({
  id,
  position: { x: 0, y: 0 },
  label: undefined,
  appearance: {
    classNames: [],
    color: undefined,
  },
  focused: false,
  selected: false,
  ...overrides,
});

const makeEdge = (
  id: ReturnType<typeof edgeId>,
  source: ReturnType<typeof nodeId>,
  target: ReturnType<typeof nodeId>,
  overrides: Partial<RenderEdge> = {},
): RenderEdge => ({
  id,
  source,
  target,
  directed: false,
  label: undefined,
  appearance: {
    classNames: [],
    color: undefined,
  },
  selected: false,
  ...overrides,
});

const createNow = (...values: readonly number[]): (() => number) => {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;

    index += 1;

    return value;
  };
};

const canAttachCytoscapeToDom = (): boolean => {
  if (typeof navigator === "object" && /jsdom/i.test(navigator.userAgent)) {
    return false;
  }

  try {
    return typeof HTMLCanvasElement === "function";
  } catch {
    return false;
  }
};

const itWhenCanvasAvailable = canAttachCytoscapeToDom() ? it : it.skip;

describe("Cytoscape renderer", () => {
  it("creates a headless Cytoscape session and applies add, update, and remove commands in batches", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");
    const renderer = createCytoscapeRenderer();
    const mounted = renderer.createSession({
      headless: true,
      now: createNow(10, 15, 20, 28, 30, 33),
    });

    expect(isRight(mounted)).toBe(true);

    if (isRight(mounted)) {
      const session = mounted.right;
      const addResult = session.applyCommands([
        {
          type: "node/add",
          node: makeNode(alpha, {
            label: "Alpha",
            appearance: {
              classNames: ["person"],
              color: "#008000",
            },
            focused: true,
            selected: true,
          }),
        },
        {
          type: "node/add",
          node: makeNode(beta, {
            label: "Beta",
            position: { x: 40, y: 80 },
          }),
        },
        {
          type: "edge/add",
          edge: makeEdge(alphaBeta, alpha, beta, {
            label: "Alpha -> Beta",
            directed: true,
            selected: true,
          }),
        },
      ]);

      expect(isRight(addResult)).toBe(true);

      if (isRight(addResult)) {
        expect(addResult.right).toEqual({
          durationMs: 5,
          commandCount: 3,
        });
      }

      expect(session.cy.$id(alpha).data()).toEqual({
        id: alpha,
        label: "Alpha",
        color: "#008000",
      });
      expect(session.cy.$id(alpha).classes()).toEqual(["person", "mk-focused"]);
      expect(session.cy.$id(alpha).selected()).toBe(true);
      expect(session.cy.$id(beta).position()).toEqual({ x: 40, y: 80 });
      expect(session.cy.$id(alphaBeta).classes()).toEqual(["mk-directed"]);
      expect(session.cy.$id(alphaBeta).selected()).toBe(true);

      const updateResult = session.applyCommands([
        {
          type: "node/update",
          node: makeNode(alpha, {
            label: "Alpha Prime",
            position: { x: 10, y: 20 },
          }),
        },
        {
          type: "edge/update",
          edge: makeEdge(alphaBeta, beta, alpha, {
            label: "Beta -> Alpha",
          }),
        },
        {
          type: "edge/remove",
          edgeId: alphaBeta,
        },
      ]);

      expect(isRight(updateResult)).toBe(true);

      if (isRight(updateResult)) {
        expect(updateResult.right).toEqual({
          durationMs: 8,
          commandCount: 3,
        });
      }

      expect(session.cy.$id(alpha).data()).toEqual({
        id: alpha,
        label: "Alpha Prime",
        color: "#94a3b8",
      });
      expect(session.cy.$id(alpha).classes()).toEqual([]);
      expect(session.cy.$id(alpha).position()).toEqual({ x: 10, y: 20 });
      expect(session.cy.$id(alphaBeta).length).toBe(0);

      session.dispose();
      expect(session.cy.destroyed()).toBe(true);
    }
  });

  itWhenCanvasAvailable("attaches and detaches a Cytoscape session from a DOM container", () => {
    const renderer = createCytoscapeRenderer();
    const mounted = renderer.createSession({
      headless: true,
    });

    expect(isRight(mounted)).toBe(true);

    if (isRight(mounted)) {
      const session = mounted.right;
      const container = document.createElement("div");
      const attachResult = session.attach({
        container,
      });

      expect(isRight(attachResult)).toBe(true);
      expect(session.cy.container()).toBe(container);

      session.detach();

      expect(session.cy.container()).toBe(null);

      session.dispose();
    }
  });

  it("normalizes Cytoscape tap and selection events into renderer events", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");
    const events: unknown[] = [];
    const renderer = createCytoscapeRenderer();
    const mounted = renderer.createSession({
      headless: true,
      onEvent: (event) => {
        events.push(event);
      },
    });

    expect(isRight(mounted)).toBe(true);

    if (isRight(mounted)) {
      const session = mounted.right;

      session.applyCommands([
        { type: "node/add", node: makeNode(alpha) },
        { type: "node/add", node: makeNode(beta) },
        { type: "edge/add", edge: makeEdge(alphaBeta, alpha, beta) },
      ]);

      session.cy.$id(alpha).emit("tap");
      session.cy.$id(alpha).select();
      session.cy.$id(alphaBeta).select();

      expect(events).toEqual([
        {
          type: "node/activate",
          nodeId: alpha,
        },
        {
          type: "selection/change",
          selection: {
            nodeIds: [alpha],
            edgeIds: [],
          },
        },
        {
          type: "selection/change",
          selection: {
            nodeIds: [alpha],
            edgeIds: [alphaBeta],
          },
        },
      ]);

      session.dispose();
    }
  });

  it("runs native layouts and returns captured node positions", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const receivedPositions: unknown[] = [];
    const renderer = createCytoscapeRenderer();
    const mounted = renderer.createSession({
      headless: true,
      now: createNow(100, 104, 200, 204),
    });

    expect(isRight(mounted)).toBe(true);

    if (isRight(mounted)) {
      const session = mounted.right;

      session.applyCommands([
        { type: "node/add", node: makeNode(alpha) },
        { type: "node/add", node: makeNode(beta) },
      ]);

      const layoutResult = session.runNativeLayout({
        name: "preset",
        options: {
          positions: {
            [alpha]: { x: 12, y: 24 },
            [beta]: { x: 36, y: 48 },
          },
        },
        onPositions: (positions) => {
          receivedPositions.push(positions);
        },
      });

      expect(isRight(layoutResult)).toBe(true);

      if (isRight(layoutResult)) {
        expect(layoutResult.right.durationMs).toBe(4);
        expect(layoutResult.right.positions.get(alpha)).toEqual({ x: 12, y: 24 });
        expect(layoutResult.right.positions.get(beta)).toEqual({ x: 36, y: 48 });
      }

      expect(receivedPositions).toHaveLength(1);

      session.dispose();
    }
  });

  it("wraps missing-element failures in adapter-level error values", () => {
    const alpha = nodeId("alpha");
    const renderer = createCytoscapeRenderer();
    const mounted = renderer.createSession({
      headless: true,
    });

    expect(isRight(mounted)).toBe(true);

    if (isRight(mounted)) {
      const session = mounted.right;
      const result = session.applyCommands([
        {
          type: "node/update",
          node: makeNode(alpha),
        },
      ]);

      expect(isLeft(result)).toBe(true);

      if (isLeft(result)) {
        expect(result.left).toEqual({
          code: "cytoscape_missing_element",
          message: `Cytoscape element "${alpha}" does not exist for command "node/update"`,
          commandType: "node/update",
          elementId: alpha,
        });
      }

      session.dispose();
    }
  });

  it("builds a base stylesheet and appends overrides deterministically", () => {
    const stylesheet = createCytoscapeStylesheet([
      {
        selector: ".person",
        style: {
          shape: "round-rectangle",
        },
      },
    ]);

    expect(stylesheet.map((rule) => rule.selector)).toEqual([
      "node",
      "edge",
      ".mk-focused",
      ".mk-directed",
      "node:selected",
      "edge:selected",
      ".person",
    ]);
  });
});
