import type { Thunk } from "./thunk";

export type IO<A> = {
  readonly _tag: "IO";
  readonly run: Thunk<A>;
};
