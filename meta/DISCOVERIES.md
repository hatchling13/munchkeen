# Discoveries

This document records architectural findings that are important enough to keep,
but are not yet frozen decisions, target architecture commitments, or immediate
execution tasks.

Use it for:

- newly uncovered design tensions
- important observations about the current implementation
- tradeoffs that should remain visible before they are resolved

If a discovery becomes settled, move or summarize it into `DECISIONS.md`.
If it changes the intended system shape, reflect that in `ARCHITECTURE.md`.
If it becomes scheduled work, represent that in `TODO.md`.

## Runtime Boundary Discovery

Date:

- 2026-03-29

Status:

- Promoted

Summary:

- The current public integration surface is effectively browser-oriented even
  though the pure core remains runtime-neutral.

What was observed:

- The root package export was centered on the Solid `Graph` component.
- The then-current top-level renderer contract included
  `container?: HTMLElement`.
- The then-current `Graph` implementation mounted a renderer into a DOM element
  and therefore acted as a browser/client integration surface.

Why this matters:

- The pure core pipeline still remains portable in spirit and implementation.
- However, the public integration surface currently encourages consumers to
  think of the library as a DOM-bound Solid graph component rather than as a
  runtime-neutral graph core with multiple integrations.
- If this shape remains in place for too long, later runtime-neutralization will
  likely require either a breaking public API revision or additive parallel
  entrypoints.

Current tension:

- There is a difference between:
- a practical Solid-first browser library with a reusable pure core
- a runtime-neutral graph core where Solid/DOM is only one integration layer

Both are valid directions, but they imply different public contracts.

Candidate directions:

- Keep `Graph` as the browser-oriented public surface and later add a separate
  core-oriented subpath export such as `munchkeen/core`.
- Redesign the public renderer mount contract so DOM-specific concerns are not
  introduced at the top-level renderer boundary.
- Split renderer lifecycle into two stages, such as session creation plus
  optional DOM attachment, so non-DOM runtimes can use the same renderer
  session model without pretending to own an `HTMLElement`.

Current assessment:

- The first option is the least disruptive and easiest to add incrementally.
- The third option appears structurally cleaner if runtime-neutrality is a real
  product goal, but it would require a more explicit public integration
  refactor.

Questions to answer later:

- Is `munchkeen` primarily a Solid/browser graph component library with a strong
  pure core, or is the pure core intended to be a first-class public product?
- Is multi-runtime support a likely product direction or only a theoretical
  possibility?
- Should the root package remain centered on `Graph`, or should `Graph` become
  one public surface among several?

Promotion rule:

- Do not move this into `DECISIONS.md` until the runtime boundary direction is
  intentionally chosen.

Promotion note:

- On 2026-03-29, the runtime boundary direction was chosen in favor of treating
  the pure core as a first-class concern and moving toward the session-plus-DOM-attachment split described here.

### Option 1 vs Option 3

This discovery currently has two especially plausible paths.

#### Option 1

- Keep `Graph` as the main browser-oriented public surface.
- Add another public entry later for consumers who want direct access to the
  pure core or lower-level orchestration.

Strengths:

- Lowest migration cost from the current implementation.
- Preserves the current Solid-first product shape.
- Minimizes immediate refactoring around `Graph`, renderer contracts, and demos.
- Makes it easy to keep shipping browser-facing improvements without first
  redesigning the runtime boundary.

Weaknesses:

- The root public story still centers the DOM-oriented `Graph` component.
- Runtime-neutrality becomes additive rather than foundational.
- A later push toward multi-runtime parity may require duplicated entrypoints or
  more public layering than desired.

Best fit:

- `munchkeen` is primarily a Solid/browser graph component library.
- The pure core is important, but not the primary public product.

#### Option 3

- Refactor the renderer lifecycle so renderer session creation is separated from
  optional DOM attachment.
- Make DOM attachment an integration concern rather than the top-level renderer
  contract.

Strengths:

- Better aligns the public boundary with the already runtime-neutral pure core.
- Makes multi-runtime support a first-class architectural property rather than a
  later extension.
- Keeps Solid/DOM as one integration layer instead of the implicit semantic
  center of the package.

Weaknesses:

- Requires a more visible refactor of the current public integration boundary.
- Forces earlier redesign work around renderer contracts and tests.
- Adds short-term implementation churn before the package has even stabilized
  its browser-facing story.

Best fit:

- The pure core is intended to become a first-class public product.
- Multi-runtime support is a real likely direction rather than a theoretical
  possibility.

### Draft Recommendation

Provisional recommendation:

- If the product intent remains strongly browser-first, prefer Option 1.
- If runtime-neutrality is part of the intended identity of the library, prefer
  Option 3 and do it before the package is publicly stabilized.

Current lean:

- Because the package is not yet publicly released, Option 3 remains the
  structurally stronger choice if the team wants the core to matter as much as
  the Solid integration.
- If there is no serious intention to support non-browser integration surfaces,
  Option 1 is the more pragmatic choice and should be treated as intentional
  rather than accidental.

What would promote this into `DECISIONS.md`:

- A direct decision on whether `munchkeen` is primarily a browser-first Solid
  graph library or a runtime-neutral graph core with Solid as one integration.

## Viewport Geometry Sync Discovery

Date:

- 2026-03-29

Status:

- Open

Summary:

- Graph-external DOM layout changes can make Cytoscape viewport geometry stale
  even when the graph's semantic state has not changed.

What was observed:

- After the development performance panel grew taller, graph hit-testing began
  to feel vertically offset from the cursor.
- The immediate fix was to trigger viewport synchronization after renderer
  attach and after render-command application.

Why this matters:

- Renderer correctness at the browser boundary depends not only on semantic
  graph updates, but also on DOM layout changes around the viewport.
- Some layout shifts are caused by the graph itself, while others come from
  unrelated UI concerns such as sidebars, banners, font loading, responsive
  reflow, or container animation.

Current assessment:

- Attach-time and apply-time viewport sync covers the observed regression and
  is an appropriate short-term integration fix.
- It is not yet clear whether this should be generalized into observer-based
  viewport sync for graph-external layout changes.

Questions to answer later:

- Should `Graph` or a browser-specific renderer integration observe viewport
  size and position changes continuously?
- Is `ResizeObserver` enough, or would some layout-shift cases require broader
  observation at the integration boundary?
- Should viewport sync remain best-effort integration bookkeeping, or become an
  explicit renderer-session contract guarantee?

Promotion rule:

- Move this into `DECISIONS.md` only if observer-based viewport synchronization
  or an equivalent browser-boundary policy is intentionally chosen.
- Represent it in `TODO.md` once the team decides that broader viewport
  observation should be implemented rather than merely noted as a risk.
