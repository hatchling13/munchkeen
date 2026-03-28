import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from "solid-js";

import {
  Graph,
  type GraphData,
  type GraphRenderer,
  type GraphTheme,
  type GraphView,
  type LayoutSpec,
} from "munchkeen";
import type { RenderCommandBatch } from "munchkeen/core";
import {
  createCytoscapeRenderer,
  type CytoscapeCommandApplyResult,
} from "munchkeen/cytoscape";

import {
  corePipelineExampleInput,
  runCorePipelineExample,
} from "../examples/core-pipeline";
import {
  focusedNeighborhoodExampleGraph,
  focusedNeighborhoodExampleInitialView,
  focusedNeighborhoodExampleTheme,
} from "../examples/focused-neighborhood";
import {
  minimalGraphExampleGraph,
  minimalGraphExampleInitialView,
} from "../examples/minimal-graph";
import corePipelineCode from "../examples/core-pipeline.ts?raw";
import focusedNeighborhoodCode from "../examples/focused-neighborhood.tsx?raw";
import minimalGraphCode from "../examples/minimal-graph.tsx?raw";

import styles from "./App.module.css";

type PerformanceSample = {
  readonly batch: number;
  readonly durationMs: number;
  readonly commandCount: number;
  readonly frameBudgetPercent: number;
  readonly withinFrameBudget: boolean;
  readonly commandSummary: string;
};

type GraphExampleDescriptor = {
  readonly id: "minimal" | "focused";
  readonly kind: "graph";
  readonly title: string;
  readonly eyebrow: string;
  readonly summary: string;
  readonly entrypoint: "munchkeen";
  readonly supportingEntrypoints: readonly "munchkeen/cytoscape"[];
  readonly highlights: readonly string[];
  readonly fileName: string;
  readonly source: string;
  readonly graph: GraphData;
  readonly initialView: GraphView;
  readonly theme?: GraphTheme<string, string>;
  readonly buildLayout: (view: GraphView) => LayoutSpec;
};

type CoreExampleDescriptor = {
  readonly id: "core";
  readonly kind: "core";
  readonly title: string;
  readonly eyebrow: string;
  readonly summary: string;
  readonly entrypoint: "munchkeen/core";
  readonly supportingEntrypoints: readonly [];
  readonly highlights: readonly string[];
  readonly fileName: string;
  readonly source: string;
};

type ExampleDescriptor = GraphExampleDescriptor | CoreExampleDescriptor;
type ExampleId = ExampleDescriptor["id"];
type EntrypointId = "munchkeen" | "munchkeen/core" | "munchkeen/cytoscape";
const DEFAULT_EXAMPLE_ID: ExampleId = "minimal";

const cloneGraphView = (view: GraphView): GraphView => ({
  ...view,
  neighborhood: view.neighborhood === undefined ? undefined : { ...view.neighborhood },
  selectedNodeIds: view.selectedNodeIds === undefined ? undefined : [...view.selectedNodeIds],
  selectedEdgeIds: view.selectedEdgeIds === undefined ? undefined : [...view.selectedEdgeIds],
  hiddenNodeIds: view.hiddenNodeIds === undefined ? undefined : [...view.hiddenNodeIds],
  hiddenEdgeIds: view.hiddenEdgeIds === undefined ? undefined : [...view.hiddenEdgeIds],
});

const summarizeCommandBatch = (commands: RenderCommandBatch): string => {
  const counts = new Map<string, number>();

  for (const command of commands) {
    counts.set(command.type, (counts.get(command.type) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return "no-op";
  }

  return [...counts.entries()]
    .map(([type, count]) => `${type} x${count}`)
    .join(", ");
};

const toPerformanceSample = (
  batch: number,
  commands: RenderCommandBatch,
  result: CytoscapeCommandApplyResult,
): PerformanceSample => ({
  batch,
  durationMs: result.durationMs,
  commandCount: result.commandCount,
  frameBudgetPercent: result.frameBudget.frameBudgetPercent,
  withinFrameBudget: result.frameBudget.withinFrameBudget,
  commandSummary: summarizeCommandBatch(commands),
});

const describeRenderCommand = (command: RenderCommandBatch[number]): string => {
  switch (command.type) {
    case "node/add":
    case "node/update":
      return `${command.type} ${command.node.label ?? command.node.id}`;
    case "node/remove":
      return `${command.type} ${command.nodeId}`;
    case "edge/add":
    case "edge/update":
      return `${command.type} ${command.edge.label ?? command.edge.id}`;
    case "edge/remove":
      return `${command.type} ${command.edgeId}`;
  }
};

const entrypoints = [
  {
    id: "munchkeen",
    label: "munchkeen",
    copy: "Solid-first public surface for rendering and interacting with graphs.",
  },
  {
    id: "munchkeen/core",
    label: "munchkeen/core",
    copy: "Pure validation, projection, layout, scene, and diff pipeline with no DOM dependency.",
  },
  {
    id: "munchkeen/cytoscape",
    label: "munchkeen/cytoscape",
    copy: "Typed renderer companion for Cytoscape sessions, performance reporting, and escape hatches.",
  },
] as const satisfies readonly {
  readonly id: EntrypointId;
  readonly label: string;
  readonly copy: string;
}[];

const examples = [
  {
    id: "minimal",
    kind: "graph",
    title: "Minimal Graph",
    eyebrow: "Root entrypoint",
    summary:
      "The smallest useful surface: pass graph data, a layout spec, and a view, then let Graph reconcile the renderer.",
    entrypoint: "munchkeen",
    supportingEntrypoints: ["munchkeen/cytoscape"],
    highlights: [
      "Shows the root package as the shortest path from data to an interactive graph.",
      "Keeps the example intentionally small enough to read in one sitting.",
      "The live preview still uses the Cytoscape companion package under the hood for timing metrics.",
    ],
    fileName: "examples/minimal-graph.tsx",
    source: minimalGraphCode,
    graph: minimalGraphExampleGraph,
    initialView: minimalGraphExampleInitialView,
    buildLayout: (view) => ({
      kind: "breadthfirst",
      root: view.focus ?? minimalGraphExampleInitialView.focus,
    }),
  },
  {
    id: "focused",
    kind: "graph",
    title: "Focused Neighborhood",
    eyebrow: "Controlled view + theme",
    summary:
      "The same Graph surface with more opinion: neighborhood projection, typed theme overrides, and controlled selection feedback.",
    entrypoint: "munchkeen",
    supportingEntrypoints: ["munchkeen/cytoscape"],
    highlights: [
      "Demonstrates theme layering without leaking renderer-specific style concepts into the core contract.",
      "Keeps focus and selection in app state so the example reads like real product code.",
      "Uses a radial layout rooted at the active focus to make neighborhood changes obvious.",
    ],
    fileName: "examples/focused-neighborhood.tsx",
    source: focusedNeighborhoodCode,
    graph: focusedNeighborhoodExampleGraph,
    initialView: focusedNeighborhoodExampleInitialView,
    theme: focusedNeighborhoodExampleTheme,
    buildLayout: (view) => ({
      kind: "radial",
      root: view.focus ?? focusedNeighborhoodExampleInitialView.focus,
      center: { x: 0, y: 0 },
    }),
  },
  {
    id: "core",
    kind: "core",
    title: "Core Pipeline",
    eyebrow: "Pure pipeline",
    summary:
      "Skip Solid and Cytoscape entirely and inspect the pure graph pipeline from validation through render commands.",
    entrypoint: "munchkeen/core",
    supportingEntrypoints: [],
    highlights: [
      "Makes the core-first decision concrete by showing the pipeline without a browser integration layer.",
      "Useful when you want to extend or test the semantic stages directly.",
      "The resulting render commands are the same currency the renderer adapters consume later.",
    ],
    fileName: "examples/core-pipeline.ts",
    source: corePipelineCode,
  },
] as const satisfies readonly ExampleDescriptor[];

const exampleIdSet = new Set<ExampleId>(examples.map((example) => example.id));

const isExampleId = (value: string): value is ExampleId => exampleIdSet.has(value as ExampleId);

const readExampleIdFromHash = (): ExampleId | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return isExampleId(value) ? value : undefined;
};

const replaceExampleHash = (id: ExampleId): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#${id}`,
  );
};

const pushExampleHash = (id: ExampleId): void => {
  if (typeof window === "undefined") {
    return;
  }

  const nextHash = `#${id}`;

  if (window.location.hash === nextHash) {
    return;
  }

  window.location.hash = nextHash;
};

const App: Component = () => {
  const [selectedExampleId, setSelectedExampleId] = createSignal<ExampleId>(
    readExampleIdFromHash() ?? DEFAULT_EXAMPLE_ID,
  );
  const [view, setView] = createSignal<GraphView>(cloneGraphView(minimalGraphExampleInitialView));
  const [samples, setSamples] = createSignal<readonly PerformanceSample[]>([]);
  const [lastError, setLastError] = createSignal<string | undefined>(undefined);

  const baseRenderer = createCytoscapeRenderer();
  let batchIndex = 0;

  const renderer: GraphRenderer = {
    kind: baseRenderer.kind,
    createSession: (options) => {
      const created = baseRenderer.createSession(options);

      if (created._tag === "Left") {
        setLastError(created.left.message);
        return created;
      }

      const session = created.right;

      return {
        ...session,
        attach: (attachOptions: { readonly container: HTMLElement }) => {
          const result = session.attach(attachOptions);

          if (result._tag === "Left") {
            setLastError(result.left.message);
          }

          return result;
        },
        applyCommands: (commands: RenderCommandBatch) => {
          const result = session.applyCommands(commands);

          if (result._tag === "Left") {
            setLastError(result.left.message);
            return result;
          }

          batchIndex += 1;
          setLastError(undefined);
          setSamples((current) =>
            [toPerformanceSample(batchIndex, commands, result.right), ...current].slice(0, 6),
          );

          return result;
        },
      };
    },
  };

  onMount(() => {
    const initialExampleId = readExampleIdFromHash();

    if (initialExampleId === undefined) {
      replaceExampleHash(DEFAULT_EXAMPLE_ID);
    } else {
      setSelectedExampleId(initialExampleId);
    }

    const handleHashChange = (): void => {
      const nextExampleId = readExampleIdFromHash();

      if (nextExampleId === undefined) {
        replaceExampleHash(selectedExampleId());
        return;
      }

      setSelectedExampleId(nextExampleId);
    };

    window.addEventListener("hashchange", handleHashChange);

    onCleanup(() => {
      window.removeEventListener("hashchange", handleHashChange);
    });
  });

  const selectedExample = createMemo<ExampleDescriptor>(() => {
    const id = selectedExampleId();
    const example = examples.find((candidate) => candidate.id === id);

    if (example === undefined) {
      throw new Error(`Unknown example: ${id}`);
    }

    return example;
  });

  const graphExample = createMemo<GraphExampleDescriptor | undefined>(() => {
    const example = selectedExample();

    return example.kind === "graph" ? example : undefined;
  });

  createEffect(() => {
    const example = selectedExample();

    batchIndex = 0;
    setSamples([]);
    setLastError(undefined);

    if (example.kind === "graph") {
      setView(cloneGraphView(example.initialView));
    }
  });

  const activeEntrypoints = createMemo(() => {
    const example = selectedExample();

    return new Set<EntrypointId>([example.entrypoint, ...example.supportingEntrypoints]);
  });

  const latestSample = createMemo(() => samples()[0]);
  const averageDurationMs = createMemo(() => {
    const current = samples();

    if (current.length === 0) {
      return undefined;
    }

    return current.reduce((sum, sample) => sum + sample.durationMs, 0) / current.length;
  });
  const worstFrameBudgetPercent = createMemo(() => {
    const current = samples();

    if (current.length === 0) {
      return undefined;
    }

    return Math.max(...current.map((sample) => sample.frameBudgetPercent));
  });
  const graphLayout = createMemo<LayoutSpec | undefined>(() => {
    const example = graphExample();

    return example === undefined ? undefined : example.buildLayout(view());
  });
  const activeNodeSummary = createMemo(() => view().selectedNodeIds?.join(", ") ?? "none");
  const activeEdgeSummary = createMemo(() => view().selectedEdgeIds?.join(", ") ?? "none");
  const corePipeline = createMemo(() => {
    try {
      return {
        ok: true as const,
        result: runCorePipelineExample(),
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Unknown pipeline error",
      };
    }
  });
  const successfulCorePipeline = createMemo(() =>
    corePipeline().ok ? corePipeline().result : undefined,
  );
  const corePipelineError = createMemo(() =>
    corePipeline().ok ? undefined : corePipeline().message,
  );
  const latestDurationLabel = createMemo(() => {
    const sample = latestSample();

    return sample === undefined ? "n/a" : `${sample.durationMs.toFixed(2)} ms`;
  });
  const averageDurationLabel = createMemo(() => {
    const duration = averageDurationMs();

    return duration === undefined ? "n/a" : `${duration.toFixed(2)} ms`;
  });
  const latestFrameBudgetLabel = createMemo(() => {
    const sample = latestSample();

    return sample === undefined ? "n/a" : `${sample.frameBudgetPercent.toFixed(1)}%`;
  });
  const worstFrameBudgetLabel = createMemo(() => {
    const frameBudgetPercent = worstFrameBudgetPercent();

    return frameBudgetPercent === undefined ? "n/a" : `${frameBudgetPercent.toFixed(1)}%`;
  });

  return (
    <main class={styles.appShell}>
      <section class={styles.hero}>
        <div class={styles.heroCopy}>
          <p class={styles.kicker}>munchkeen</p>
          <h1 class={styles.title}>Examples as documentation</h1>
          <p class={styles.lead}>
            This page is built from the same example files that ship with the package, so the docs
            stay honest: the code you read is the code that powers the preview.
          </p>
        </div>
        <div class={styles.heroStats}>
          <div class={styles.statCard}>
            <span class={styles.label}>Current example</span>
            <strong>{selectedExample().title}</strong>
            <p>{selectedExample().summary}</p>
          </div>
          <div class={styles.statCard}>
            <span class={styles.label}>Entry surface</span>
            <strong>{selectedExample().entrypoint}</strong>
            <p>
              {selectedExample().kind === "graph"
                ? "Live preview is rendered through the root component surface."
                : "This example stays inside the pure pipeline with no browser dependency."}
            </p>
          </div>
        </div>
      </section>

      <section class={styles.entrypointSection}>
        <div class={styles.sectionHeading}>
          <div>
            <p class={styles.kicker}>Public entrypoints</p>
            <h2 class={styles.sectionTitle}>Choose the right layer</h2>
          </div>
          <p class={styles.sectionCopy}>
            The docs page uses each published surface the way a consumer would: root for Solid,
            core for semantic stages, and the Cytoscape companion for typed renderer hooks.
          </p>
        </div>
        <div class={styles.entrypointGrid}>
          <For each={entrypoints}>
            {(entrypoint) => {
              const isActive = createMemo(() => activeEntrypoints().has(entrypoint.id));
              const isPrimary = createMemo(() => selectedExample().entrypoint === entrypoint.id);

              return (
                <article
                  class={`${styles.entrypointCard} ${isActive() ? styles.entrypointCardActive : ""}`}
                >
                  <div class={styles.entrypointHeader}>
                    <code>{entrypoint.label}</code>
                    <Show when={isActive()}>
                      <span class={styles.badge}>{isPrimary() ? "source" : "preview"}</span>
                    </Show>
                  </div>
                  <p>{entrypoint.copy}</p>
                </article>
              );
            }}
          </For>
        </div>
      </section>

      <section class={styles.exampleSection}>
        <div class={styles.sectionHeading}>
          <div>
            <p class={styles.kicker}>Examples</p>
            <h2 class={styles.sectionTitle}>Runnable slices of the library</h2>
          </div>
          <p class={styles.sectionCopy}>
            Switch between a minimal graph, a controlled neighborhood view, and the pure pipeline.
            Each tab now has a shareable hash URL.
          </p>
        </div>
        <div class={styles.exampleTabs}>
          <For each={examples}>
            {(example) => (
              <button
                class={`${styles.exampleTab} ${selectedExampleId() === example.id ? styles.exampleTabActive : ""}`}
                type="button"
                onClick={() => {
                  setSelectedExampleId(example.id);
                  pushExampleHash(example.id);
                }}
              >
                <span>{example.title}</span>
                <small>{example.eyebrow}</small>
              </button>
            )}
          </For>
        </div>

        <div class={styles.workspace}>
          <section class={styles.previewPanel}>
            <div class={styles.panelHeader}>
              <div>
                <p class={styles.kicker}>Preview</p>
                <h3 class={styles.panelTitle}>{selectedExample().title}</h3>
              </div>
              <code class={styles.fileTag}>{selectedExample().fileName}</code>
            </div>

            <Show
              when={graphExample()}
              fallback={
                <div class={styles.pipelinePanel}>
                  <div class={styles.pipelineIntro}>
                    <div class={styles.metricCard}>
                      <span class={styles.label}>Input graph</span>
                      <strong>
                        {corePipelineExampleInput.nodes.length} nodes / {corePipelineExampleInput.edges.length} edges
                      </strong>
                      <p>The example starts from raw graph data, not a renderer-specific structure.</p>
                    </div>
                    <div class={styles.metricCard}>
                      <span class={styles.label}>Output batch</span>
                      <Show
                        when={successfulCorePipeline()}
                        fallback={<strong class={styles.warn}>{corePipelineError() ?? "unknown error"}</strong>}
                      >
                        {(result) => <strong>{result().commands.length} commands</strong>}
                      </Show>
                      <p>Those commands are the semantic diff that adapters consume later.</p>
                    </div>
                  </div>

                  <Show when={successfulCorePipeline()}>
                    {(result) => (
                      <>
                        <div class={styles.pipelineGrid}>
                          <div class={styles.metricCard}>
                            <span class={styles.label}>Validated</span>
                            <strong>{result().validated.nodes.length} nodes</strong>
                            <p>{result().validated.edges.length} edges survive validation.</p>
                          </div>
                          <div class={styles.metricCard}>
                            <span class={styles.label}>Projected</span>
                            <strong>{result().projected.nodes.length} nodes</strong>
                            <p>{result().projected.edges.length} edges remain after view projection.</p>
                          </div>
                          <div class={styles.metricCard}>
                            <span class={styles.label}>Laid out</span>
                            <strong>{result().laidOut.positions.size} positions</strong>
                            <p>Layout assigns deterministic coordinates before scene construction.</p>
                          </div>
                          <div class={styles.metricCard}>
                            <span class={styles.label}>Render scene</span>
                            <strong>{result().scene.nodes.length} nodes</strong>
                            <p>{result().scene.edges.length} edges enter the renderer-agnostic scene.</p>
                          </div>
                        </div>

                        <div class={styles.commandPanel}>
                          <div class={styles.historyHeader}>
                            <span class={styles.label}>Render commands</span>
                            <span class={styles.historyHint}>Diff from nothing to the first scene</span>
                          </div>
                          <ul class={styles.commandList}>
                            <For each={result().commands}>
                              {(command) => <li class={styles.commandItem}>{describeRenderCommand(command)}</li>}
                            </For>
                          </ul>
                        </div>
                      </>
                    )}
                  </Show>
                </div>
              }
            >
              {(example) => (
                <>
                  <div class={styles.stateGrid}>
                    <div class={styles.stateCard}>
                      <span class={styles.label}>Focus</span>
                      <strong>{view().focus ?? "none"}</strong>
                      <p>Clicking a node updates the controlled view and re-roots the layout.</p>
                    </div>
                    <div class={styles.stateCard}>
                      <span class={styles.label}>Selected nodes</span>
                      <strong>{activeNodeSummary()}</strong>
                      <p>Selection is echoed back from the renderer through the public callbacks.</p>
                    </div>
                    <div class={styles.stateCard}>
                      <span class={styles.label}>Selected edges</span>
                      <strong>{activeEdgeSummary()}</strong>
                      <p>The preview treats selection as app-controlled state, not renderer-owned state.</p>
                    </div>
                  </div>

                  <div class={styles.metricGrid}>
                    <div class={styles.metricCard}>
                      <span class={styles.label}>Latest batch</span>
                      <strong>{latestSample()?.batch ?? "none"}</strong>
                      <p>{latestSample()?.commandSummary ?? "Interact with the graph to produce a render batch."}</p>
                    </div>
                    <div class={styles.metricCard}>
                      <span class={styles.label}>Duration</span>
                      <strong>{latestDurationLabel()}</strong>
                      <p>Avg {averageDurationLabel()}</p>
                    </div>
                    <div class={styles.metricCard}>
                      <span class={styles.label}>Frame budget</span>
                      <strong class={latestSample()?.withinFrameBudget === false ? styles.warn : styles.ok}>
                        {latestFrameBudgetLabel()}
                      </strong>
                      <p>Worst {worstFrameBudgetLabel()}</p>
                    </div>
                    <div class={styles.metricCard}>
                      <span class={styles.label}>Last error</span>
                      <strong>{lastError() ?? "none"}</strong>
                      <p>The live preview measures command timing at the Cytoscape adapter boundary.</p>
                    </div>
                  </div>

                  <div class={styles.history}>
                    <div class={styles.historyHeader}>
                      <span class={styles.label}>Recent batches</span>
                      <span class={styles.historyHint}>Latest 6 apply cycles</span>
                    </div>
                    <ul class={styles.historyList}>
                      <Show
                        when={samples().length > 0}
                        fallback={
                          <li class={styles.historyItem}>
                            <strong>waiting</strong>
                            <span>Interact with the graph to capture the first Cytoscape batch.</span>
                            <span>0 cmds</span>
                            <span>n/a</span>
                            <span>n/a</span>
                          </li>
                        }
                      >
                        <For each={samples()}>
                          {(sample) => (
                            <li class={styles.historyItem}>
                              <strong>#{sample.batch}</strong>
                              <span>{sample.commandSummary}</span>
                              <span>{sample.commandCount} cmds</span>
                              <span>{sample.durationMs.toFixed(2)} ms</span>
                              <span class={sample.withinFrameBudget ? styles.ok : styles.warn}>
                                {sample.frameBudgetPercent.toFixed(1)}%
                              </span>
                            </li>
                          )}
                        </For>
                      </Show>
                    </ul>
                  </div>

                  <div class={styles.previewActions}>
                    <button
                      class={styles.actionButton}
                      type="button"
                      onClick={() => {
                        batchIndex = 0;
                        setSamples([]);
                        setLastError(undefined);
                        setView(cloneGraphView(example().initialView));
                      }}
                    >
                      Reset view
                    </button>
                    <button
                      class={styles.actionButton}
                      type="button"
                      onClick={() => {
                        setView((current) => ({
                          ...current,
                          selectedNodeIds: [],
                          selectedEdgeIds: [],
                        }));
                      }}
                    >
                      Clear selection
                    </button>
                  </div>

                  <div class={styles.stage}>
                    <Graph
                      class={styles.graph}
                      fallback={<div class={styles.fallback}>The graph could not be rendered.</div>}
                      graph={example().graph}
                      layout={graphLayout()}
                      renderer={renderer}
                      theme={example().theme}
                      view={view()}
                      onNodeActivate={(node) => {
                        setView((current) => ({
                          ...current,
                          focus: node.id,
                          selectedNodeIds: [node.id],
                          selectedEdgeIds: [],
                        }));
                      }}
                      onSelectionChange={(selection) => {
                        setView((current) => ({
                          ...current,
                          selectedNodeIds: selection.nodeIds,
                          selectedEdgeIds: selection.edgeIds,
                        }));
                      }}
                    />
                  </div>
                </>
              )}
            </Show>
          </section>

          <aside class={styles.docsPanel}>
            <div class={styles.panelHeader}>
              <div>
                <p class={styles.kicker}>Guide</p>
                <h3 class={styles.panelTitle}>{selectedExample().eyebrow}</h3>
              </div>
              <code class={styles.fileTag}>{selectedExample().entrypoint}</code>
            </div>

            <p class={styles.docsCopy}>{selectedExample().summary}</p>

            <div class={styles.notePanel}>
              <div class={styles.historyHeader}>
                <span class={styles.label}>What this example teaches</span>
                <span class={styles.historyHint}>Straight from the runnable source</span>
              </div>
              <ul class={styles.noteList}>
                <For each={selectedExample().highlights}>
                  {(highlight) => <li>{highlight}</li>}
                </For>
              </ul>
            </div>

            <div class={styles.codePanel}>
              <div class={styles.historyHeader}>
                <span class={styles.label}>Source</span>
                <span class={styles.historyHint}>{selectedExample().fileName}</span>
              </div>
              <pre class={styles.codeBlock}>
                <code>{selectedExample().source}</code>
              </pre>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default App;
