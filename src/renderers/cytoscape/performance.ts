export const DEFAULT_CYTOSCAPE_FRAME_BUDGET_MS = 1000 / 60;

export type CytoscapeFrameBudgetReport = {
  readonly frameBudgetMs: number;
  readonly frameBudgetRatio: number;
  readonly frameBudgetPercent: number;
  readonly withinFrameBudget: boolean;
};

type TimedCommandBatch = {
  readonly durationMs: number;
  readonly commandCount: number;
};

export type CytoscapeExecutionBaseline = {
  readonly minimalDurationMs: number;
  readonly fullReplaceDurationMs: number;
  readonly durationSavedMs: number;
  readonly relativeDurationRatio: number;
  readonly minimalCommandCount: number;
  readonly fullReplaceCommandCount: number;
  readonly commandsSaved: number;
  readonly relativeCommandRatio: number;
};

const toRelativeRatio = (numerator: number, denominator: number): number => {
  if (denominator === 0) {
    return numerator === 0 ? 1 : Number.POSITIVE_INFINITY;
  }

  return numerator / denominator;
};

export const describeCytoscapeFrameBudget = (
  durationMs: number,
  frameBudgetMs = DEFAULT_CYTOSCAPE_FRAME_BUDGET_MS,
): CytoscapeFrameBudgetReport => {
  const frameBudgetRatio = toRelativeRatio(durationMs, frameBudgetMs);

  return {
    frameBudgetMs,
    frameBudgetRatio,
    frameBudgetPercent: frameBudgetRatio * 100,
    withinFrameBudget: durationMs <= frameBudgetMs,
  };
};

export const compareCytoscapeExecutionBaseline = ({
  minimal,
  fullReplace,
}: {
  readonly minimal: TimedCommandBatch;
  readonly fullReplace: TimedCommandBatch;
}): CytoscapeExecutionBaseline => ({
  minimalDurationMs: minimal.durationMs,
  fullReplaceDurationMs: fullReplace.durationMs,
  durationSavedMs: fullReplace.durationMs - minimal.durationMs,
  relativeDurationRatio: toRelativeRatio(minimal.durationMs, fullReplace.durationMs),
  minimalCommandCount: minimal.commandCount,
  fullReplaceCommandCount: fullReplace.commandCount,
  commandsSaved: fullReplace.commandCount - minimal.commandCount,
  relativeCommandRatio: toRelativeRatio(minimal.commandCount, fullReplace.commandCount),
});
