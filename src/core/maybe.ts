export type Nothing = {
  readonly _tag: "Nothing";
};

export type Just<A> = {
  readonly _tag: "Just";
  readonly value: A;
};

export type Maybe<A> = Nothing | Just<A>;
