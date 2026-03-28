import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Graph,
  edgeId,
  nodeId,
  type GraphRenderer,
  type GraphSelection,
  type GraphView,
} from "../src";
import type { RenderCommand } from "../src/core/commands";

type StubRendererEvent =
  | {
      readonly type: "node/activate";
      readonly nodeId: ReturnType<typeof nodeId>;
    }
  | {
      readonly type: "selection/change";
      readonly selection: GraphSelection;
    };

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const flushFrame = async (): Promise<void> => {
  if (typeof requestAnimationFrame !== "function") {
    return;
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
};

const createStubRenderer = (options?: {
  readonly onApply?: (
    commands: readonly RenderCommand[],
    emit: (event: StubRendererEvent) => void,
  ) => void;
}) => {
  let onEvent:
    | ((event: StubRendererEvent) => void)
    | undefined;

  const applyCommands = vi.fn((commands: readonly RenderCommand[]) => {
    options?.onApply?.(commands, (event) => {
      onEvent?.(event);
    });

    return {
      _tag: "Right" as const,
      right: {
        commandCount: commands.length,
      },
    };
  });
  const attach = vi.fn((_attachOptions?: { readonly container: HTMLElement }) => ({
    _tag: "Right" as const,
    right: undefined,
  }));
  const detach = vi.fn();
  const syncViewport = vi.fn();
  const dispose = vi.fn();
  const createSession = vi.fn((sessionOptions?: Parameters<GraphRenderer["createSession"]>[0]) => {
    onEvent = sessionOptions?.onEvent;

    return {
      _tag: "Right" as const,
      right: {
        attach,
        detach,
        syncViewport,
        applyCommands,
        dispose,
      },
    };
  });

  return {
    renderer: {
      kind: "stub",
      createSession,
    } satisfies GraphRenderer,
    applyCommands,
    attach,
    detach,
    syncViewport,
    dispose,
    createSession,
    emit: (event: StubRendererEvent) => {
      onEvent?.(event);
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
});

const describeClientOnly =
  import.meta.env.MODE === "ssr" || import.meta.env.SSR ? describe.skip : describe;

describeClientOnly("Graph component", () => {
  it("mounts a renderer, applies initial and incremental diffs, and disposes cleanly", async () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");
    const renderer = createStubRenderer();
    const [view, setView] = createSignal<GraphView>({
      selectedNodeIds: [alpha],
    });
    const host = document.createElement("div");

    document.body.append(host);

    const dispose = render(
      () => (
        <Graph
          graph={{
            nodes: [
              { id: alpha, label: "Alpha" },
              { id: beta, label: "Beta" },
            ],
            edges: [
              {
                id: alphaBeta,
                source: alpha,
                target: beta,
                directed: true,
                label: "Alpha -> Beta",
              },
            ],
          }}
          layout={{
            kind: "preset",
            positions: new Map([
              [alpha, { x: 0, y: 0 }],
              [beta, { x: 120, y: 40 }],
            ]),
          }}
          renderer={renderer.renderer}
          view={view()}
        />
      ),
      host,
    );

    await flush();
    await flushFrame();

    expect(renderer.createSession).toHaveBeenCalledTimes(1);
    expect(renderer.attach).toHaveBeenCalledTimes(1);
    expect(renderer.syncViewport).toHaveBeenCalledTimes(2);
    expect(renderer.attach.mock.calls[0]?.[0]?.container).toBeInstanceOf(HTMLDivElement);
    expect(renderer.applyCommands).toHaveBeenCalledTimes(1);
    expect(renderer.applyCommands.mock.calls[0]?.[0]).toEqual([
      {
        type: "node/add",
        node: expect.objectContaining({
          id: alpha,
          position: { x: 0, y: 0 },
          selected: true,
        }),
      },
      {
        type: "node/add",
        node: expect.objectContaining({
          id: beta,
          position: { x: 120, y: 40 },
          selected: false,
        }),
      },
      {
        type: "edge/add",
        edge: expect.objectContaining({
          id: alphaBeta,
          selected: false,
          directed: true,
        }),
      },
    ]);

    setView({
      selectedNodeIds: [beta],
      selectedEdgeIds: [alphaBeta],
    });

    await flush();
    await flushFrame();

    expect(renderer.applyCommands).toHaveBeenCalledTimes(2);
    expect(renderer.syncViewport).toHaveBeenCalledTimes(3);
    expect(renderer.applyCommands.mock.calls[1]?.[0]).toEqual([
      {
        type: "node/update",
        node: expect.objectContaining({
          id: alpha,
          selected: false,
        }),
      },
      {
        type: "node/update",
        node: expect.objectContaining({
          id: beta,
          selected: true,
        }),
      },
      {
        type: "edge/update",
        edge: expect.objectContaining({
          id: alphaBeta,
          selected: true,
        }),
      },
    ]);

    dispose();

    expect(renderer.detach).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it("forwards user interaction callbacks while suppressing selection echoes during reconcile", async () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");
    const renderer = createStubRenderer({
      onApply: (_commands, emit) => {
        emit({
          type: "selection/change",
          selection: {
            nodeIds: [alpha],
            edgeIds: [],
          },
        });
      },
    });
    const onNodeActivate = vi.fn();
    const onSelectionChange = vi.fn();
    const host = document.createElement("div");
    const graph = {
      nodes: [
        { id: alpha, label: "Alpha" },
        { id: beta, label: "Beta" },
      ],
      edges: [
        {
          id: alphaBeta,
          source: alpha,
          target: beta,
        },
      ],
    };

    document.body.append(host);

    render(
      () => (
        <Graph
          graph={graph}
          layout={{
            kind: "preset",
            positions: new Map([
              [alpha, { x: 0, y: 0 }],
              [beta, { x: 100, y: 20 }],
            ]),
          }}
          onNodeActivate={onNodeActivate}
          onSelectionChange={onSelectionChange}
          renderer={renderer.renderer}
        />
      ),
      host,
    );

    await flush();
    await flushFrame();

    expect(onSelectionChange).not.toHaveBeenCalled();

    renderer.emit({
      type: "selection/change",
      selection: {
        nodeIds: [beta],
        edgeIds: [alphaBeta],
      },
    });
    renderer.emit({
      type: "node/activate",
      nodeId: beta,
    });

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith({
      nodeIds: [beta],
      edgeIds: [alphaBeta],
    });
    expect(onNodeActivate).toHaveBeenCalledTimes(1);
    expect(onNodeActivate).toHaveBeenCalledWith(graph.nodes[1]);
  });

  it("shows fallback and clears the mounted renderer when the graph becomes invalid", async () => {
    const alpha = nodeId("alpha");
    const beta = nodeId("beta");
    const alphaBeta = edgeId("alpha-beta");
    const renderer = createStubRenderer();
    const [graph, setGraph] = createSignal({
      nodes: [
        { id: alpha, label: "Alpha" },
        { id: beta, label: "Beta" },
      ],
      edges: [
        {
          id: alphaBeta,
          source: alpha,
          target: beta,
        },
      ],
    });
    const host = document.createElement("div");

    document.body.append(host);

    render(
      () => (
        <Graph
          fallback={<span>graph unavailable</span>}
          graph={graph()}
          layout={{
            kind: "preset",
            positions: new Map([
              [alpha, { x: 0, y: 0 }],
              [beta, { x: 100, y: 20 }],
            ]),
          }}
          renderer={renderer.renderer}
        />
      ),
      host,
    );

    await flush();
    await flushFrame();

    expect(renderer.applyCommands).toHaveBeenCalledTimes(1);

    setGraph({
      nodes: [
        { id: alpha, label: "Alpha" },
        { id: alpha, label: "Duplicate Alpha" },
      ],
      edges: [],
    });

    await flush();
    await flushFrame();

    expect(renderer.applyCommands).toHaveBeenCalledTimes(2);
    expect(renderer.syncViewport).toHaveBeenCalledTimes(3);
    expect(renderer.applyCommands.mock.calls[1]?.[0]).toEqual([
      {
        type: "edge/remove",
        edgeId: alphaBeta,
      },
      {
        type: "node/remove",
        nodeId: alpha,
      },
      {
        type: "node/remove",
        nodeId: beta,
      },
    ]);
    expect(host.querySelector("[data-munchkeen-graph]")?.getAttribute("data-status")).toBe(
      "invalid-graph",
    );
    expect(host.textContent).toContain("graph unavailable");
  });
});
