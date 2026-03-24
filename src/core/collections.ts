// Small internal helpers for deterministic readonly collection transforms.
export const dedupe = <A>(values: readonly A[]): readonly A[] => [...new Set(values)];

export const mapFromEntries = <K, V>(entries: Iterable<readonly [K, V]>): ReadonlyMap<K, V> =>
  new Map(entries);
