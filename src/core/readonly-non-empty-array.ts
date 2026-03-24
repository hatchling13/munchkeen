import { just, nothing, type Maybe } from "./maybe";

// Readonly array that is guaranteed to contain at least one element.
export type ReadonlyNonEmptyArray<A> = readonly [A, ...A[]];

export const isReadonlyNonEmptyArray = <A>(
  values: readonly A[],
): values is ReadonlyNonEmptyArray<A> => values.length > 0;

export const fromReadonlyArray = <A>(
  values: readonly A[],
): Maybe<ReadonlyNonEmptyArray<A>> =>
  isReadonlyNonEmptyArray(values) ? just(values) : nothing;

export const head = <A>(values: ReadonlyNonEmptyArray<A>): A => values[0];

export const tail = <A>(values: ReadonlyNonEmptyArray<A>): readonly A[] => {
  const [, ...rest] = values;

  return rest;
};

export const mapReadonlyNonEmptyArray = <A, B>(
  values: ReadonlyNonEmptyArray<A>,
  map: (value: A) => B,
): ReadonlyNonEmptyArray<B> => {
  const [first, ...rest] = values;

  return [map(first), ...rest.map(map)];
};
