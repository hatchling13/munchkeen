import { dedupe } from "./collections";
import { isJust, type Maybe } from "./maybe";

export type NodeAppearance = {
  readonly className?: string;
  readonly color?: string;
  readonly label?: string;
};

export type EdgeAppearance = {
  readonly className?: string;
  readonly color?: string;
  readonly label?: string;
};

type ThemeSection<Appearance, Kind extends string> = {
  readonly default?: Appearance;
  readonly byKind?: Readonly<Partial<Record<Kind, Appearance>>>;
};

export type GraphTheme<
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly nodes?: ThemeSection<NodeAppearance, NodeKind>;
  readonly edges?: ThemeSection<EdgeAppearance, EdgeKind>;
};

export type ResolvedNodeTheme = {
  readonly classNames: readonly string[];
  readonly color?: string;
  readonly label?: string;
};

export type ResolvedEdgeTheme = {
  readonly classNames: readonly string[];
  readonly color?: string;
  readonly label?: string;
};

const toClassNames = (className: string | undefined): readonly string[] =>
  className === undefined ? [] : [className];

const resolveNodeKindAppearance = <NodeKind extends string, EdgeKind extends string>(
  theme: GraphTheme<NodeKind, EdgeKind> | undefined,
  kind: Maybe<NodeKind>,
): NodeAppearance | undefined => {
  if (!isJust(kind)) {
    return undefined;
  }

  return theme?.nodes?.byKind?.[kind.value];
};

const resolveEdgeKindAppearance = <NodeKind extends string, EdgeKind extends string>(
  theme: GraphTheme<NodeKind, EdgeKind> | undefined,
  kind: Maybe<EdgeKind>,
): EdgeAppearance | undefined => {
  if (!isJust(kind)) {
    return undefined;
  }

  return theme?.edges?.byKind?.[kind.value];
};

export const resolveNodeTheme = <NodeKind extends string = string, EdgeKind extends string = string>(
  theme: GraphTheme<NodeKind, EdgeKind> | undefined,
  kind: Maybe<NodeKind>,
): ResolvedNodeTheme => {
  const defaultAppearance = theme?.nodes?.default;
  const kindAppearance = resolveNodeKindAppearance(theme, kind);

  return {
    classNames: dedupe([
      ...toClassNames(defaultAppearance?.className),
      ...toClassNames(kindAppearance?.className),
    ]),
    color: kindAppearance?.color ?? defaultAppearance?.color,
    label: kindAppearance?.label ?? defaultAppearance?.label,
  };
};

export const resolveEdgeTheme = <NodeKind extends string = string, EdgeKind extends string = string>(
  theme: GraphTheme<NodeKind, EdgeKind> | undefined,
  kind: Maybe<EdgeKind>,
): ResolvedEdgeTheme => {
  const defaultAppearance = theme?.edges?.default;
  const kindAppearance = resolveEdgeKindAppearance(theme, kind);

  return {
    classNames: dedupe([
      ...toClassNames(defaultAppearance?.className),
      ...toClassNames(kindAppearance?.className),
    ]),
    color: kindAppearance?.color ?? defaultAppearance?.color,
    label: kindAppearance?.label ?? defaultAppearance?.label,
  };
};
