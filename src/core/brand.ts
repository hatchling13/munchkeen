declare const brandSymbol: unique symbol;

// Distinguishes values that share the same runtime shape but must not mix in type space.
export type Brand<Primitive, Tag extends string> = Primitive & {
  readonly [brandSymbol]: Tag;
};

// TypeScript cannot materialize branded primitives without a cast, so keep that escape hatch local.
export const brand = <Primitive, Tag extends string>(value: Primitive): Brand<Primitive, Tag> =>
  value as Brand<Primitive, Tag>;
