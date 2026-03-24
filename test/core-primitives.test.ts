import { describe, expect, it } from "vitest";

import {
  flatMapEither,
  getOrElseEither,
  isLeft,
  isRight,
  left,
  mapEither,
  mapLeft,
  matchEither,
  right,
} from "../src/core/either";
import { flatMapIO, io, mapIO, unsafeRunIO } from "../src/core/io";
import {
  flatMapMaybe,
  isJust,
  isNothing,
  just,
  mapMaybe,
  matchMaybe,
  nothing,
} from "../src/core/maybe";
import {
  fromReadonlyArray,
  head,
  isReadonlyNonEmptyArray,
  mapReadonlyNonEmptyArray,
  tail,
} from "../src/core/readonly-non-empty-array";

describe("Maybe", () => {
  it("constructs and transforms Just values", () => {
    const maybe = flatMapMaybe(
      mapMaybe(just(2), (value) => value + 1),
      (value) => just(value * 3),
    );

    expect(isJust(maybe)).toBe(true);

    if (isJust(maybe)) {
      expect(maybe.value).toBe(9);
    }
  });

  it("preserves Nothing through matches and transforms", () => {
    expect(isNothing(mapMaybe(nothing, (value: number) => value + 1))).toBe(true);
    expect(matchMaybe(nothing, () => "missing", String)).toBe("missing");
  });
});

describe("Either", () => {
  it("maps successful Right values", () => {
    const either = flatMapEither(
      mapEither(right(5), (value) => value + 1),
      (value) => right(value * 2),
    );

    expect(isRight(either)).toBe(true);

    if (isRight(either)) {
      expect(either.right).toBe(12);
    }
  });

  it("preserves and transforms Left values", () => {
    const failure = mapLeft(left("boom"), (error) => `${error}!`);

    expect(isLeft(failure)).toBe(true);
    expect(matchEither(failure, (error) => error, String)).toBe("boom!");
    expect(getOrElseEither(left("bad"), (error) => error.length)).toBe(3);
  });
});

describe("IO", () => {
  it("defers execution until explicitly run", () => {
    let calls = 0;

    const effect = mapIO(
      io(() => {
        calls += 1;

        return 2;
      }),
      (value) => value + 3,
    );

    expect(calls).toBe(0);
    expect(unsafeRunIO(effect)).toBe(5);
    expect(calls).toBe(1);
  });

  it("chains wrapped effects without collapsing IO into a plain thunk", () => {
    const effect = flatMapIO(
      io(() => 4),
      (value) => io(() => value * 2),
    );

    expect(effect._tag).toBe("IO");
    expect(unsafeRunIO(effect)).toBe(8);
  });
});

describe("ReadonlyNonEmptyArray", () => {
  it("refines readonly arrays into a non-empty representation", () => {
    expect(isReadonlyNonEmptyArray([])).toBe(false);
    expect(isReadonlyNonEmptyArray([1])).toBe(true);

    const values = fromReadonlyArray([1, 2, 3] as const);

    expect(isJust(values)).toBe(true);

    if (isJust(values)) {
      expect(head(values.value)).toBe(1);
      expect(tail(values.value)).toEqual([2, 3]);
      expect(mapReadonlyNonEmptyArray(values.value, String)).toEqual(["1", "2", "3"]);
    }
  });

  it("returns Nothing for empty arrays", () => {
    expect(isNothing(fromReadonlyArray([]))).toBe(true);
  });
});
