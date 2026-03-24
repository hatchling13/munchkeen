import { describe, expect, it } from "vitest";

import { isLeft, isRight } from "../src/core/either";
import { runLayout } from "../src/core/layout";
import { edgeId, nodeId } from "../src/core/model";
import { projectGraph } from "../src/core/project";
import { validateGraph } from "../src/core/validate";

describe("runLayout", () => {
  it("runs preset layout with explicit positions for every projected node", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");

    const validated = validateGraph({
      nodes: [{ id: alpha }, { id: beta }],
      edges: [{ id: alphaBeta, source: alpha, target: beta }],
    });

    expect(isRight(validated)).toBe(true);

    if (isRight(validated)) {
      const projected = projectGraph({
        graph: validated.right,
      });

      expect(isRight(projected)).toBe(true);

      if (isRight(projected)) {
        const result = runLayout({
          graph: projected.right,
          layout: {
            kind: "preset",
            positions: new Map([
              [alpha, { x: 10, y: 20 }],
              [beta, { x: 30, y: 40 }],
            ]),
          },
        });

        expect(isRight(result)).toBe(true);

        if (isRight(result)) {
          expect(result.right.nodeIds).toEqual([alpha, beta]);
          expect(result.right.positions.get(alpha)).toEqual({ x: 10, y: 20 });
          expect(result.right.positions.get(beta)).toEqual({ x: 30, y: 40 });
        }
      }
    }
  });

  it("returns structured errors when preset positions or layout roots are missing", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const missing = nodeId("missing");

    const validated = validateGraph({
      nodes: [{ id: alpha }, { id: beta }],
      edges: [],
    });

    expect(isRight(validated)).toBe(true);

    if (isRight(validated)) {
      const projected = projectGraph({
        graph: validated.right,
      });

      expect(isRight(projected)).toBe(true);

      if (isRight(projected)) {
        const missingPresetPosition = runLayout({
          graph: projected.right,
          layout: {
            kind: "preset",
            positions: new Map([[alpha, { x: 0, y: 0 }]]),
          },
        });

        const missingRoot = runLayout({
          graph: projected.right,
          layout: {
            kind: "breadthfirst",
            root: missing,
          },
        });

        expect(isLeft(missingPresetPosition)).toBe(true);
        expect(isLeft(missingRoot)).toBe(true);

        if (isLeft(missingPresetPosition)) {
          expect(missingPresetPosition.left).toEqual({
            code: "missing_preset_position",
            message: "Preset layout requires positions for every projected node",
            nodeIds: [beta],
          });
        }

        if (isLeft(missingRoot)) {
          expect(missingRoot.left).toEqual({
            code: "missing_layout_root",
            message: `Layout root "${missing}" does not exist in the projected graph`,
            kind: "breadthfirst",
            root: missing,
          });
        }
      }
    }
  });

  it("centers radial layout on the requested root and places the remaining nodes on a deterministic ring", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const gamma = nodeId("gamma");

    const validated = validateGraph({
      nodes: [{ id: alpha }, { id: beta }, { id: gamma }],
      edges: [],
    });

    expect(isRight(validated)).toBe(true);

    if (isRight(validated)) {
      const projected = projectGraph({
        graph: validated.right,
      });

      expect(isRight(projected)).toBe(true);

      if (isRight(projected)) {
        const result = runLayout({
          graph: projected.right,
          layout: {
            kind: "radial",
            root: beta,
            center: { x: 10, y: 20 },
          },
        });

        expect(isRight(result)).toBe(true);

        if (isRight(result)) {
          const alphaPosition = result.right.positions.get(alpha);
          const betaPosition = result.right.positions.get(beta);
          const gammaPosition = result.right.positions.get(gamma);

          expect(betaPosition).toEqual({ x: 10, y: 20 });
          expect(alphaPosition?.x).toBeCloseTo(10, 10);
          expect(alphaPosition?.y).toBeCloseTo(-140, 10);
          expect(gammaPosition?.x).toBeCloseTo(10, 10);
          expect(gammaPosition?.y).toBeCloseTo(180, 10);
        }
      }
    }
  });

  it("runs breadthfirst layout deterministically and uses it as the default when no layout is provided", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const gamma = nodeId("gamma");
    const delta = nodeId("delta");
    const alphaBeta = edgeId("alpha-beta");
    const alphaGamma = edgeId("alpha-gamma");
    const betaDelta = edgeId("beta-delta");

    const validated = validateGraph({
      nodes: [{ id: alpha }, { id: beta }, { id: gamma }, { id: delta }],
      edges: [
        { id: alphaBeta, source: alpha, target: beta, directed: true },
        { id: alphaGamma, source: alpha, target: gamma, directed: true },
        { id: betaDelta, source: beta, target: delta, directed: true },
      ],
    });

    expect(isRight(validated)).toBe(true);

    if (isRight(validated)) {
      const projected = projectGraph({
        graph: validated.right,
      });

      expect(isRight(projected)).toBe(true);

      if (isRight(projected)) {
        const explicit = runLayout({
          graph: projected.right,
          layout: {
            kind: "breadthfirst",
            root: alpha,
          },
        });

        const implicit = runLayout({
          graph: projected.right,
        });

        expect(isRight(explicit)).toBe(true);
        expect(isRight(implicit)).toBe(true);

        if (isRight(explicit) && isRight(implicit)) {
          expect(explicit.right.positions.get(alpha)).toEqual({ x: 0, y: 0 });
          expect(explicit.right.positions.get(beta)).toEqual({ x: -90, y: 140 });
          expect(explicit.right.positions.get(gamma)).toEqual({ x: 90, y: 140 });
          expect(explicit.right.positions.get(delta)).toEqual({ x: 0, y: 280 });
          expect(implicit.right.positions).toEqual(explicit.right.positions);
        }
      }
    }
  });
});
