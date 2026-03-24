// General suspended synchronous computation with no effect-specific meaning attached.
export type Thunk<A> = () => A;
