import { describe, expect, expectTypeOf, it } from "vitest";

import type { GraphProps } from "../src";
import { isRight, type Either } from "../src/core/either";
import { runLayout } from "../src/core/layout";
import { just, nothing } from "../src/core/maybe";
import { edgeId, nodeId } from "../src/core/model";
import { projectGraph } from "../src/core/project";
import { buildRenderScene } from "../src/core/scene";
import { resolveEdgeTheme, resolveNodeTheme, type GraphTheme } from "../src/core/theme";
import { validateGraph } from "../src/core/validate";

const expectRight = <E, A>(value: Either<E, A>): A => {
  expect(isRight(value)).toBe(true);

  if (isRight(value)) {
    return value.right;
  }

  throw new Error("Expected Right result");
};

describe("theme resolution", () => {
  it("merges default and kind-specific theme values without leaking kind lookup into callers", () => {
    const theme = {
      nodes: {
        default: {
          className: "node",
          color: "#999999",
        },
        byKind: {
          person: {
            className: "person",
            color: "#008000",
          },
        },
      },
      edges: {
        default: {
          className: "edge",
          color: "#666666",
        },
        byKind: {
          worksAt: {
            className: "employment",
            label: "Works At",
          },
        },
      },
    } satisfies GraphTheme<"person" | "company", "worksAt">;

    expect(resolveNodeTheme(theme, just("person"))).toEqual({
      classNames: ["node", "person"],
      color: "#008000",
      label: undefined,
    });
    expect(resolveNodeTheme(theme, nothing)).toEqual({
      classNames: ["node"],
      color: "#999999",
      label: undefined,
    });
    expect(resolveEdgeTheme(theme, just("worksAt"))).toEqual({
      classNames: ["edge", "employment"],
      color: "#666666",
      label: "Works At",
    });
  });

  it("keeps Graph props theme keys aligned with declared node and edge kinds", () => {
    expectTypeOf<
      NonNullable<GraphProps<unknown, unknown, "person" | "company", "worksAt">["theme"]>
    >().toEqualTypeOf<GraphTheme<"person" | "company", "worksAt">>();
  });
});

describe("buildRenderScene", () => {
  it("builds a renderer-agnostic scene from laid out graph data, view state, and theme state", () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const gamma = nodeId("gamma");
    const worksAt = edgeId("works-at");
    const mentors = edgeId("mentors");

    const theme = {
      nodes: {
        default: {
          className: "node",
          color: "#999999",
        },
        byKind: {
          person: {
            className: "person",
            color: "#008000",
          },
          company: {
            label: "Company",
          },
        },
      },
      edges: {
        default: {
          className: "edge",
          color: "#666666",
        },
        byKind: {
          worksAt: {
            className: "employment",
            label: "Works At",
          },
        },
      },
    } satisfies GraphTheme<"person" | "company", "worksAt">;

    const validated = expectRight(
      validateGraph({
        nodes: [
          { id: alpha, kind: "person", label: "Ada" },
          { id: beta, kind: "company", label: "Analytical Engine" },
          { id: gamma, label: "Gamma" },
        ],
        edges: [
          {
            id: worksAt,
            source: alpha,
            target: beta,
            kind: "worksAt",
            label: "employment edge",
            directed: true,
          },
          {
            id: mentors,
            source: beta,
            target: gamma,
            label: "Mentors",
          },
        ],
      }),
    );
    const projected = expectRight(
      projectGraph({
        graph: validated,
      }),
    );
    const laidOut = expectRight(
      runLayout({
        graph: projected,
        layout: {
          kind: "preset",
          positions: new Map([
            [alpha, { x: 0, y: 0 }],
            [beta, { x: 100, y: 40 }],
            [gamma, { x: 180, y: 120 }],
          ]),
        },
      }),
    );
    const scene = buildRenderScene({
      graph: laidOut,
      view: {
        focus: beta,
        selectedNodeIds: [gamma, alpha, alpha],
        selectedEdgeIds: [mentors, worksAt, worksAt],
      },
      theme,
    });

    expect(scene).toEqual({
      _tag: "RenderScene",
      nodes: [
        {
          id: alpha,
          position: { x: 0, y: 0 },
          label: "Ada",
          appearance: {
            classNames: ["node", "person"],
            color: "#008000",
          },
          focused: false,
          selected: true,
        },
        {
          id: beta,
          position: { x: 100, y: 40 },
          label: "Company",
          appearance: {
            classNames: ["node"],
            color: "#999999",
          },
          focused: true,
          selected: false,
        },
        {
          id: gamma,
          position: { x: 180, y: 120 },
          label: "Gamma",
          appearance: {
            classNames: ["node"],
            color: "#999999",
          },
          focused: false,
          selected: true,
        },
      ],
      edges: [
        {
          id: worksAt,
          source: alpha,
          target: beta,
          directed: true,
          label: "Works At",
          appearance: {
            classNames: ["edge", "employment"],
            color: "#666666",
          },
          selected: true,
        },
        {
          id: mentors,
          source: beta,
          target: gamma,
          directed: false,
          label: "Mentors",
          appearance: {
            classNames: ["edge"],
            color: "#666666",
          },
          selected: true,
        },
      ],
      selection: {
        nodeIds: [gamma, alpha],
        edgeIds: [mentors, worksAt],
      },
    });
  });

  it("fails loudly when a laid out graph violates the position invariant", () => {
    const alpha = nodeId("alpha");

    const validated = expectRight(
      validateGraph({
        nodes: [{ id: alpha, label: "Alpha" }],
        edges: [],
      }),
    );
    const projected = expectRight(
      projectGraph({
        graph: validated,
      }),
    );
    const laidOut = expectRight(
      runLayout({
        graph: projected,
        layout: {
          kind: "preset",
          positions: new Map([[alpha, { x: 0, y: 0 }]]),
        },
      }),
    );
    const broken = {
      ...laidOut,
      positions: new Map(),
    };

    expect(() =>
      buildRenderScene({
        graph: broken,
      }),
    ).toThrowError(`LaidOutGraph is missing a position for node "${alpha}"`);
  });
});
