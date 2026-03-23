# Decisions

This document records implementation decisions that have been explicitly frozen.

Its purpose is reproducibility. A separate thread or contributor should be able to read this file together with [ARCHITECTURE.md](./ARCHITECTURE.md) and [TODO.md](./TODO.md) and continue the same implementation flow without re-litigating already decided questions.

## Status

Current milestone:

- `Step 0: Freeze vocabulary` is considered complete

This does not mean all future design questions are closed. It means the naming and boundary decisions required to begin implementation have been fixed.

## How To Use This File

When there is tension between documents:

1. `DECISIONS.md` wins for questions that are explicitly listed here.
2. `ARCHITECTURE.md` explains the intended shape of the system.
3. `TODO.md` explains execution order and prerequisites.

If a future change should override a decision here, this file should be updated explicitly rather than relying on scattered chat context.

## Product Direction

Frozen decisions:

- `munchkeen` is a Solid-first interactive graph exploration toolkit.
- v1 is optimized for exploration, not editing.
- Cytoscape.js is the first renderer adapter and the first production renderer.
- Cytoscape.js is not the semantic center of the library and is not the source of truth.
- The central product pipeline is:

```text
graph -> projection -> layout -> scene -> renderer
```

- The central implementation stance is:

```text
immutable values -> pure transforms -> render commands -> effect interpreter
```

## Public API Vocabulary

The following names are frozen for the initial public surface:

- `Graph`
- `GraphData`
- `GraphNode`
- `GraphEdge`
- `GraphView`
- `GraphTheme`
- `LayoutSpec`
- `GraphRenderer`
- `NodeAppearance`
- `EdgeAppearance`

Notes:

- Public names should remain renderer-neutral.
- Public names should remain friendly to non-FP consumers.
- Public API should not expose third-party FP types.

## Internal Stage Vocabulary

The following internal names are frozen for the core pipeline:

- `GraphDataInput`
- `ValidatedGraph`
- `ProjectedGraph`
- `LaidOutGraph`
- `RenderScene`
- `RenderCommand`

These names describe staged guarantees in the pure core. They are internal by default unless a future need justifies exposing them.

## Public vs Internal Boundary

Frozen decisions:

- Public API is implementation-neutral and renderer-neutral.
- Internal implementation may use Haskell-friendly FP vocabulary.
- Renderer-specific data structures do not become canonical public models.
- Cytoscape `elements` remain adapter-facing interop data, not the canonical graph model.
- Public API does not use `<Graph><Node /><Edge /></Graph>` as the primary abstraction.

## Internal FP Vocabulary

The following internal FP vocabulary is frozen:

- `Thunk<A>`
- `Maybe<A>`
- `Either<E, A>`
- `IO<A>`
- `ReadonlyNonEmptyArray<A>`

The following terms are explicitly not part of the frozen internal vocabulary for now:

- `Option`
- `Task`
- `TaskEither`

This is a deliberate preference for Haskell-friendly naming where practical.

## Internal FP Semantics

Frozen semantic meanings:

- `Maybe<A>` uses `Nothing | Just<A>`
- `Either<E, A>` uses `Left<E> | Right<A>`
- `Right` means success
- `Left` means failure
- `Thunk<A>` means the most general suspended synchronous computation
- `IO<A>` is not a synonym for every thunk

More precisely:

- every `IO<A>` is backed by suspended synchronous computation
- not every suspended synchronous computation is an `IO<A>`

## IO Representation

Frozen decisions:

- `IO<A>` should be represented as a wrapper, not as a plain type alias to a function
- `Thunk<A>` and `IO<A>` must stay distinct in meaning

This is intentional. The codebase should preserve the distinction between:

- general delayed computation
- semantically effectful computation

Exact helper names such as `unsafeRunIO`, `mapIO`, or `flatMapIO` are not yet frozen, but the wrapper-based representation decision is frozen.

## Async Effect Boundary

Frozen decisions:

- There is no project-wide internal `Task` abstraction at this time.
- Async work may remain adapter-local for now.
- Async effect abstractions should only be introduced when a concrete need appears.

This keeps the initial core small and avoids prematurely importing TS FP conventions that are not aligned with the preferred vocabulary.

## Graph Model Direction

Frozen decisions:

- The canonical public graph model is `GraphData`, not Cytoscape `elements`.
- Public graph values should be readonly.
- `GraphSchema` may be provided as an optional companion to `GraphData`, but it does not replace `GraphData` as the canonical public model.
- Identifiers such as `NodeId` and `EdgeId` should be implemented as branded types.
- The implementation should distinguish staged graph values such as `ValidatedGraph` and `ProjectedGraph`.
- Runtime schema validation should use a `munchkeen`-owned validator contract over `unknown`, returning structured errors.
- Third-party schema libraries may be supported through adapters rather than becoming the primary public contract.

For v1:

- public graph input should start with the simpler graph-shaped model shown in `ARCHITECTURE.md`
- `GraphSchema` is optional and additive
- schema-driven refinement is desired, but it does not block initial implementation

This means schema-aware typing is an intended direction, but Step 1 does not depend on finalizing every schema detail.

## Type-Safety Guardrails

Frozen decisions:

- Public API and pure core code should avoid `any`.
- Public API and pure core code should avoid unchecked `as T` assertions.
- If an assertion is unavoidable, it should be confined to renderer or interop boundaries and justified by tests.

## Renderer Boundary

Frozen decisions:

- Renderers interpret core-produced render data at the boundary; in v1, `RenderCommand[]` is the primary renderer update input.
- The Cytoscape adapter is effectful and sits at the boundary.
- Renderer-specific styling and layout features remain adapter-scoped.
- The renderer does not become the canonical owner of graph, view, or selection state.

## Scene Diff Strategy

Frozen decisions:

- `RenderScene` is the last renderer-agnostic semantic snapshot produced by the pure core.
- In v1, scene reconciliation is owned by the core through `diffScene(previous, next) -> RenderCommand[]`.
- The renderer adapter should treat `RenderCommand[]` as its primary update input and interpret those commands against the engine.
- `diffScene` targets deterministic minimal diffs in v1.
- Full scene replacement may exist as a fallback or debugging path, but it is not the default renderer update strategy.
- Renderer adapters do not own semantic diffing logic unless this boundary is explicitly revised in a future decision.
- The exact command algebra and diff heuristics remain implementation details until Step 8.

## Step 1 Scope

The next implementation step should assume the following scope for internal FP primitives:

- implement only the small set currently required by the core
- prefer local utilities over large external FP dependencies
- do not expose these internal primitives as part of the main public API unless there is a compelling need

The initial likely set is:

- `Brand`
- `Thunk`
- `Maybe`
- `Either`
- `IO`
- `ReadonlyNonEmptyArray`
- minimal boundary helpers such as `Dispose` and `Subscription`

## Deferred Decisions

The following questions are intentionally left open:

- the exact representation of `GraphSchema`
- the exact helper surface for `Maybe`, `Either`, and `IO`
- whether async abstractions should later be introduced
- the exact public escape hatch surface for the Cytoscape adapter

Open does not mean undecided in spirit. It means implementation should reach the relevant step before fixing those details.

## Guidance For Future Threads

If another thread continues the work:

- treat the vocabulary and boundary decisions in this file as already approved
- start from `Step 1` in [TODO.md](./TODO.md)
- do not reintroduce `Option`, `Task`, or `TaskEither` unless this file is intentionally revised
- do not collapse `IO` into a plain function alias
- do not replace `GraphData` with a third-party schema object as the main public graph contract
- do not reframe the project back into a thin Cytoscape wrapper
