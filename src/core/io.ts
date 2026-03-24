import type { Thunk } from "./thunk";

// Suspended synchronous effect kept distinct from a general-purpose Thunk.
export type IO<A> = {
  readonly _tag: "IO";
  readonly run: Thunk<A>;
};

export const io = <A>(run: Thunk<A>): IO<A> => ({
  _tag: "IO",
  run,
});

export const unsafeRunIO = <A>(effect: IO<A>): A => effect.run();

export const mapIO = <A, B>(effect: IO<A>, map: (value: A) => B): IO<B> =>
  io(() => map(unsafeRunIO(effect)));

export const flatMapIO = <A, B>(
  effect: IO<A>,
  map: (value: A) => IO<B>,
): IO<B> => io(() => unsafeRunIO(map(unsafeRunIO(effect))));
