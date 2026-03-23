export type LayoutSpec = {
  readonly kind: string;
  readonly options?: Readonly<Record<string, unknown>>;
};

export type LayoutPosition = {
  readonly x: number;
  readonly y: number;
};

export type LaidOutGraph = {
  readonly _tag: "LaidOutGraph";
  readonly positions: Readonly<Record<string, LayoutPosition>>;
};
