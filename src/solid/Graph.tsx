import { createEffect, createMemo, createSignal, onCleanup, onMount, type JSX } from "solid-js";

import { mapFromEntries } from "../core/collections";
import type { RenderCommandBatch } from "../core/commands";
import type { Dispose, GraphRenderer, GraphRendererEvent, GraphSelection } from "../core/api";
import { diffScene } from "../core/diff";
import { runLayout, type LayoutSpec } from "../core/layout";
import type { GraphData, GraphNode, GraphView } from "../core/model";
import { projectGraph } from "../core/project";
import { buildRenderScene, type RenderScene } from "../core/scene";
import type { GraphTheme } from "../core/theme";
import { validateGraph } from "../core/validate";
import { createCytoscapeRenderer } from "../renderers/cytoscape";

export type GraphProps<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly graph: GraphData<NodeData, EdgeData, NodeKind, EdgeKind>;
  readonly view?: GraphView;
  readonly layout?: LayoutSpec;
  readonly theme?: GraphTheme<NodeKind, EdgeKind>;
  readonly renderer?: GraphRenderer;
  readonly class?: string;
  readonly fallback?: JSX.Element;
  readonly onNodeActivate?: (node: GraphNode<NodeData, NodeKind>) => void;
  readonly onSelectionChange?: (selection: GraphSelection) => void;
};

type GraphStatus =
  | "idle"
  | "ready"
  | "invalid-graph"
  | "invalid-view"
  | "invalid-layout"
  | "mount-error"
  | "apply-error";

type GraphPipelineResult = {
  readonly ok: boolean;
  readonly scene: RenderScene;
  readonly status: GraphStatus;
};

type GraphRendererSession = {
  readonly attach: (options: { readonly container: HTMLElement }) => unknown;
  readonly detach?: Dispose;
  readonly syncViewport?: () => void;
  readonly applyCommands: (commands: RenderCommandBatch) => unknown;
  readonly dispose: Dispose;
};

type RightLike<A> = {
  readonly _tag: "Right";
  readonly right: A;
};

type LeftLike<E> = {
  readonly _tag: "Left";
  readonly left: E;
};

const EMPTY_RENDER_SCENE: RenderScene = {
  _tag: "RenderScene",
  nodes: [],
  edges: [],
  selection: {
    nodeIds: [],
    edgeIds: [],
  },
};

const isRecord = (value: unknown): value is Readonly<Record<PropertyKey, unknown>> =>
  typeof value === "object" && value !== null;

const isRightLike = <A,>(value: unknown): value is RightLike<A> =>
  isRecord(value) && value._tag === "Right" && "right" in value;

const isLeftLike = <E,>(value: unknown): value is LeftLike<E> =>
  isRecord(value) && value._tag === "Left" && "left" in value;

const isGraphRendererSession = (value: unknown): value is GraphRendererSession =>
  isRecord(value) &&
  typeof value.attach === "function" &&
  typeof value.applyCommands === "function" &&
  typeof value.dispose === "function";

const resolveGraphRendererSession = (value: unknown): GraphRendererSession | undefined => {
  if (isGraphRendererSession(value)) {
    return value;
  }

  if (isRightLike<GraphRendererSession>(value) && isGraphRendererSession(value.right)) {
    return value.right;
  }

  return undefined;
};

const scheduleViewportSync = (session: GraphRendererSession): void => {
  const run = () => {
    try {
      session.syncViewport?.();
    } catch {
      // Viewport sync is best-effort bookkeeping at the integration boundary.
    }
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      run();
    });
    return;
  }

  run();
};

export const Graph = <
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
>(
  props: GraphProps<NodeData, EdgeData, NodeKind, EdgeKind>,
): JSX.Element => {
  const defaultRenderer = createCytoscapeRenderer();
  const activeRenderer = createMemo(() => props.renderer ?? defaultRenderer);
  const graphNodeById = createMemo(() =>
    mapFromEntries(props.graph.nodes.map((node) => [node.id, node] as const)),
  );
  const pipeline = createMemo<GraphPipelineResult>(() => {
    const validated = validateGraph(props.graph);

    if (validated._tag === "Left") {
      return {
        ok: false,
        scene: EMPTY_RENDER_SCENE,
        status: "invalid-graph",
      };
    }

    const projected = projectGraph({
      graph: validated.right,
      view: props.view,
    });

    if (projected._tag === "Left") {
      return {
        ok: false,
        scene: EMPTY_RENDER_SCENE,
        status: "invalid-view",
      };
    }

    const laidOut = runLayout({
      graph: projected.right,
      layout: props.layout,
    });

    if (laidOut._tag === "Left") {
      return {
        ok: false,
        scene: EMPTY_RENDER_SCENE,
        status: "invalid-layout",
      };
    }

    return {
      ok: true,
      scene: buildRenderScene({
        graph: laidOut.right,
        view: props.view,
        theme: props.theme,
      }),
      status: "ready",
    };
  });
  const [session, setSession] = createSignal<GraphRendererSession | undefined>(undefined);
  const [runtimeStatus, setRuntimeStatus] = createSignal<GraphStatus>("idle");
  const status = createMemo<GraphStatus>(() => {
    const currentPipeline = pipeline();

    return currentPipeline.ok ? runtimeStatus() : currentPipeline.status;
  });
  const showFallback = createMemo(() => {
    const currentStatus = status();

    return currentStatus !== "idle" && currentStatus !== "ready";
  });

  // These refs stay local to the integration boundary rather than driving
  // render output: the viewport element owned by Solid, the last scene applied
  // to the renderer session, and a reentrancy guard so controlled selection
  // callbacks do not echo renderer-driven updates back into the app during a
  // reconcile pass.
  let container: HTMLDivElement | undefined;
  let appliedScene: RenderScene | undefined;
  let isApplyingCommands = false;

  const handleRendererEvent = (event: GraphRendererEvent): void => {
    switch (event.type) {
      case "node/activate": {
        const node = graphNodeById().get(event.nodeId);

        if (node !== undefined) {
          props.onNodeActivate?.(node);
        }

        return;
      }

      case "selection/change":
        if (!isApplyingCommands) {
          props.onSelectionChange?.(event.selection);
        }

        return;
    }
  };

  onMount(() => {
    createEffect(() => {
      const renderer = activeRenderer();

      if (container === undefined) {
        return;
      }

      const created = renderer.createSession({
        onEvent: handleRendererEvent,
      });
      const createdSession = resolveGraphRendererSession(created);

      if (createdSession === undefined || container === undefined) {
        setSession(undefined);
        setRuntimeStatus("mount-error");
        appliedScene = undefined;
        createdSession?.dispose();
        return;
      }

      const attachResult = createdSession.attach({
        container,
      });

      if (isLeftLike(attachResult)) {
        setSession(undefined);
        setRuntimeStatus("mount-error");
        appliedScene = undefined;
        createdSession.dispose();
        return;
      }

      setSession(createdSession);
      setRuntimeStatus("idle");
      scheduleViewportSync(createdSession);

      onCleanup(() => {
        setSession(undefined);
        setRuntimeStatus("idle");
        appliedScene = undefined;
        createdSession.detach?.();
        createdSession.dispose();
      });
    });
  });

  createEffect(() => {
    const mountedSession = session();
    const nextScene = pipeline().scene;

    if (mountedSession === undefined) {
      return;
    }

    const commands = diffScene(appliedScene, nextScene);

    if (commands.length === 0) {
      appliedScene = nextScene;
      setRuntimeStatus("ready");
      scheduleViewportSync(mountedSession);
      return;
    }

    try {
      isApplyingCommands = true;

      const result = mountedSession.applyCommands(commands);

      if (isLeftLike(result)) {
        setRuntimeStatus("apply-error");
        return;
      }

      appliedScene = nextScene;
      setRuntimeStatus("ready");
      scheduleViewportSync(mountedSession);
    } catch {
      setRuntimeStatus("apply-error");
    } finally {
      isApplyingCommands = false;
    }
  });

  return (
    <div
      class={props.class}
      data-edge-count={String(props.graph.edges.length)}
      data-munchkeen-graph=""
      data-node-count={String(props.graph.nodes.length)}
      data-renderer={activeRenderer().kind}
      data-status={status()}
    >
      <div
        data-munchkeen-viewport=""
        ref={(element) => {
          container = element;
        }}
        style={{
          height: "100%",
          width: "100%",
        }}
      />
      {showFallback() ? (props.fallback ?? null) : null}
    </div>
  );
};
