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

export type GraphTheme = {
  readonly nodes?: Readonly<Record<string, NodeAppearance>>;
  readonly edges?: Readonly<Record<string, EdgeAppearance>>;
};
