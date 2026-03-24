import type { Thunk } from "./thunk";

// Represents the absence of a value without falling back to null-like states.
export type Nothing = {
  readonly _tag: "Nothing";
};

// Represents the presence of a value inside Maybe.
export type Just<A> = {
  readonly _tag: "Just";
  readonly value: A;
};

// Optional value in the core, modeled explicitly as Nothing or Just.
export type Maybe<A> = Nothing | Just<A>;

export const nothing: Nothing = {
  _tag: "Nothing",
};

export const just = <A>(value: A): Just<A> => ({
  _tag: "Just",
  value,
});

export const isNothing = <A>(maybe: Maybe<A>): maybe is Nothing =>
  maybe._tag === "Nothing";

export const isJust = <A>(maybe: Maybe<A>): maybe is Just<A> =>
  maybe._tag === "Just";

export const matchMaybe = <A, B>(
  maybe: Maybe<A>,
  onNothing: Thunk<B>,
  onJust: (value: A) => B,
): B => (isNothing(maybe) ? onNothing() : onJust(maybe.value));

export const mapMaybe = <A, B>(
  maybe: Maybe<A>,
  map: (value: A) => B,
): Maybe<B> => (isNothing(maybe) ? nothing : just(map(maybe.value)));

export const flatMapMaybe = <A, B>(
  maybe: Maybe<A>,
  map: (value: A) => Maybe<B>,
): Maybe<B> => (isNothing(maybe) ? nothing : map(maybe.value));
