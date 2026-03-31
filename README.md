# munchkeen

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![codecov](https://codecov.io/gh/hatchling13/munchkeen/graph/badge.svg)](https://codecov.io/gh/hatchling13/munchkeen)

`munchkeen` is a Solid-first interactive graph exploration toolkit.

In v1, Cytoscape.js is the first renderer adapter and the first production renderer, but the library is architected around a renderer-neutral graph, projection, layout, scene, and renderer-command pipeline.

## Direction

`munchkeen` is not intended to be only a thin Cytoscape wrapper.

The package has three public entrypoints:

- `munchkeen`: the default Solid `Graph` integration surface
- `munchkeen/core`: the pure graph pipeline and state-transition surface
- `munchkeen/cytoscape`: the typed Cytoscape integration and escape hatch surface

The default root entrypoint stays friendly and intentionally leaves low-level renderer session typing opaque. If you want to work directly with the pure pipeline, use `munchkeen/core`. If you want typed Cytoscape sessions, command timing, or adapter-level helpers, use `munchkeen/cytoscape`.

## Install

Install it:

```bash
npm i munchkeen
# or
yarn add munchkeen
# or
pnpm add munchkeen
```

## Entry Points

### `munchkeen`

Use the default entrypoint when you want a controlled Solid graph component with the built-in Cytoscape renderer.

```tsx
import { Graph, edgeId, nodeId } from "munchkeen";

const ada = nodeId("ada");
const charles = nodeId("charles");
const collaborates = edgeId("collaborates");

<Graph
  graph={{
    nodes: [
      { id: ada, label: "Ada Lovelace" },
      { id: charles, label: "Charles Babbage" },
    ],
    edges: [{ id: collaborates, source: ada, target: charles, label: "collaborates" }],
  }}
  layout={{ kind: "breadthfirst", root: ada }}
  view={{
    focus: ada,
    neighborhood: { radius: 1, direction: "both" },
  }}
/>;
```

Reference example: [examples/minimal-graph.tsx](./examples/minimal-graph.tsx)

### `munchkeen/core`

Use the core entrypoint when you want to drive validation, projection, layout, scene construction, and diffing yourself.

```ts
import {
  buildRenderScene,
  diffScene,
  isLeft,
  projectGraph,
  runLayout,
  validateGraph,
} from "munchkeen/core";

const validated = validateGraph(graph);

if (isLeft(validated)) {
  throw new Error(validated.left.map((error) => error.message).join(", "));
}

const projected = projectGraph({ graph: validated.right });
const laidOut = runLayout({ graph: projected.right });
const scene = buildRenderScene({ graph: laidOut.right });
const commands = diffScene(undefined, scene);
```

Reference example: [examples/core-pipeline.ts](./examples/core-pipeline.ts)

### `munchkeen/cytoscape`

Use the Cytoscape entrypoint when you want the typed adapter surface directly.

```ts
import { createCytoscapeRenderer } from "munchkeen/cytoscape";

const renderer = createCytoscapeRenderer();
const created = renderer.createSession();

if (created._tag === "Right") {
  created.right.syncViewport();
}
```

This is the companion surface for low-level renderer authoring. The root `GraphRenderer` type intentionally stays more opaque.

## Examples

- Minimal root-component example: [examples/minimal-graph.tsx](./examples/minimal-graph.tsx)
- Core pipeline example: [examples/core-pipeline.ts](./examples/core-pipeline.ts)
- Focused neighborhood example: [examples/focused-neighborhood.tsx](./examples/focused-neighborhood.tsx)

## Tests

Run the client and SSR test suites:

```bash
pnpm test
```

Generate a local coverage report:

```bash
pnpm test:coverage
```

Vitest writes coverage artifacts to `coverage/`.

## Documentation Playground

The repository includes a docs playground built from the runnable examples in `examples/`.

```bash
pnpm docs:dev
```

That starts the Vite app in `dev/`, which now acts as the local documentation surface for the package.

To produce the static docs bundle:

```bash
pnpm docs:build
```

The output is written to `dev/dist`.

`dev/dist` can be published to any static hosting provider.

## Pure Core vs Adapter Escape Hatches

Pure core concepts live in `munchkeen/core`:

- graph data and branded ids
- view transitions
- validation
- projection
- pure layouts
- semantic scene construction
- scene diffing into render commands

Renderer-specific concerns live outside the pure core:

- DOM attachment
- viewport synchronization
- Cytoscape stylesheet generation
- Cytoscape event wiring
- command execution timing
- Cytoscape-native layouts

That split is deliberate. The pure pipeline owns semantic graph state. Renderers interpret semantic commands at the boundary.

## Current Limitations

- Cytoscape is the only production renderer today.
- The root `Graph` component is browser-oriented because it owns a DOM viewport.
- The pure core is first-class through `munchkeen/core`, but advanced staged types are still a more expert-facing surface than the root component API.
- Renderer timing currently reports adapter-local batch duration and frame-budget usage, but it does not yet provide a full live benchmark dashboard for minimal diff versus full replace outside the development harness.
