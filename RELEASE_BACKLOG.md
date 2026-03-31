# Release Backlog

This document tracks follow-up work that is intentionally deferred so release
preparation can keep moving.

Use it for:

- release polish that is useful but not blocking a deploy
- post-release hardening tasks
- maintainer-facing follow-ups that do not belong in `meta/`

Do not use it for:

- frozen architecture decisions
- implementation discoveries that still affect core direction
- dependency-ordered implementation planning

If an item becomes active implementation work, move it into issues, a PR, or
the appropriate planning document.

## Open Items

### Package family split after initial single-package release

Status:

- Deferred
- Not a release blocker

Why this is here:

- The current package shape is a good fit for an initial release because it
  keeps installation and publishing simple.
- The internal architecture already separates pure core, Cytoscape adapter, and
  Solid integration concerns clearly enough that a later package-family split
  is plausible.

Preferred long-term package shape:

- `@munchkeen/core`
- `@munchkeen/cytoscape`
- `@munchkeen/solid`

Why this shape is preferred:

- It mirrors the existing architectural layers more cleanly than mixed names
  such as `@munchkeen/cytoscape-solid`.
- It lets pure-core consumers avoid renderer and framework-specific
  dependencies.
- It gives renderer and framework integrations room to evolve independently.
- It creates a cleaner package-family story if additional integrations appear
  later.

Questions to answer before doing this:

- Whether a convenience package should still exist at `munchkeen` or whether
  the package family should become fully scoped.
- How versioning and release cadence should work across the split packages.
- Whether the current subpath exports should remain as compatibility shims
  during migration.
- How peer dependencies should be divided once Solid and Cytoscape move into
  separate packages.

Exit condition:

- Revisit only after the first public release has landed and the single-package
  distribution shape has proven itself in real usage.

### Coverage hardening after first deploy

Status:

- Deferred
- Not a release blocker

Why this is here:

- Current runtime line coverage is `90.8%`.
- The remaining gap is concentrated in a small number of integration and
  error-path files, not spread evenly across the codebase.

Highest-value follow-ups:

- Add `Graph` tests for renderer-session resolution failures, mount failures,
  apply failures, and the no-op diff path in `src/solid/Graph.tsx`.
- Add Cytoscape adapter tests for renderer creation, attach, and stylesheet
  failure paths in `src/renderers/cytoscape/adapter.ts`.
- Add interpreter tests for missing-element and native-layout failure cases in
  `src/renderers/cytoscape/interpreter.ts`.
- Expand branch coverage for deferred edge cases in `src/core/project.ts` and
  `src/core/transitions.ts`.

Notes:

- Barrel and type-only export files may appear as `0%` in reports, but they do
  not materially drag down the aggregate score because they have no executable
  lines.
- Typecheck tests improve safety and public API confidence, but they do not
  increase runtime coverage numbers.

Exit condition:

- Revisit after the first deploy stabilizes.
- Either add the targeted tests above or explicitly trim report noise if a
  file is intentionally non-executable.
