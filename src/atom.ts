import { SetStateAction } from 'react';

export type Atom<Value> = {
  init?: Value;
  read: (get: <V>(a: Atom<V>) => V) => Value;
};

export type WritableAtom<Value, Update> = Atom<Value> & {
  write: (
    get: <V>(a: Atom<V>) => V,
    set: <V, U>(a: WritableAtom<V, U>, u: U) => void,
    update: Update
  ) => void;
};

export type PrimitiveAtom<Value> = WritableAtom<Value, SetStateAction<Value>>;

export function atom<Value, Update>(
  read: (get: <V>(a: Atom<V>) => V) => Value,
  write: (
    get: <V>(a: Atom<V>) => V,
    set: <V, U>(a: WritableAtom<V, U>, u: U) => void,
    update: Update,
  ) => void,
): WritableAtom<Value, Update>;

export function atom<Value>(
  read: (get: <V>(a: Atom<V>) => V) => Value,
): Atom<Value>;

export function atom<Value>(
  initialValue: Value,
): PrimitiveAtom<Value>;

export function atom<Value, Update>(
  read: Value | ((get: <V>(a: Atom<V>) => V) => Value),
  write?: (
    get: <V>(a: Atom<V>) => V,
    set: <V, U>(a: WritableAtom<V, U>, u: U) => void,
    update: Update,
  ) => void,
) {
  if (typeof read !== 'function') {
    const a: PrimitiveAtom<Value> = {
      init: read,
      read: (get) => get(a),
      write: (get, set, update) => set(a, typeof update === 'function'
        ? (update as ((prev: Value) => Value))(get(a))
        : update),
    };
    return a;
  }
  if (write) {
    const a: WritableAtom<Value, Update> = {
      read: (get) => get(a),
      write: (_get, set, update) => set(a, update),
    };
    return a;
  }
  const a: Atom<Value> = {
    read: (get) => get(a),
  };
  return a;
}
