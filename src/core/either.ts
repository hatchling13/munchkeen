// Failure branch for computations that return errors as data.
export type Left<E> = {
  readonly _tag: "Left";
  readonly left: E;
};

// Success branch for computations that return results as data.
export type Right<A> = {
  readonly _tag: "Right";
  readonly right: A;
};

// Explicit success-or-failure result with Left for failure and Right for success.
export type Either<E, A> = Left<E> | Right<A>;

export const left = <E>(error: E): Left<E> => ({
  _tag: "Left",
  left: error,
});

export const right = <A>(value: A): Right<A> => ({
  _tag: "Right",
  right: value,
});

export const isLeft = <E, A>(either: Either<E, A>): either is Left<E> =>
  either._tag === "Left";

export const isRight = <E, A>(either: Either<E, A>): either is Right<A> =>
  either._tag === "Right";

export const matchEither = <E, A, B>(
  either: Either<E, A>,
  onLeft: (error: E) => B,
  onRight: (value: A) => B,
): B => (isLeft(either) ? onLeft(either.left) : onRight(either.right));

export const mapEither = <E, A, B>(
  either: Either<E, A>,
  map: (value: A) => B,
): Either<E, B> =>
  isLeft(either) ? left(either.left) : right(map(either.right));

export const mapLeft = <E, A, F>(
  either: Either<E, A>,
  map: (error: E) => F,
): Either<F, A> =>
  isLeft(either) ? left(map(either.left)) : right(either.right);

export const flatMapEither = <E, A, B>(
  either: Either<E, A>,
  map: (value: A) => Either<E, B>,
): Either<E, B> => (isLeft(either) ? left(either.left) : map(either.right));

export const getOrElseEither = <E, A>(
  either: Either<E, A>,
  onLeft: (error: E) => A,
): A => matchEither(either, onLeft, (value) => value);
