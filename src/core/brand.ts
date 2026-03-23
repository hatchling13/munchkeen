export type Brand<Primitive, Tag extends string> = Primitive & {
  readonly __brand: Tag;
};
