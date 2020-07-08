import { Atom, WritableAtom } from './createAtom';

type NonPromise<T> = T extends Promise<unknown> ? never : T;

export function deriveAtom<Value>(
  options: {
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => NonPromise<Value>;
    set: (arg: {
      get: <V>(a: Atom<V>) => V;
      set: <V>(a: WritableAtom<V>, v: V) => void;
    }, newValue: Value) => void | Promise<void>;
  },
): WritableAtom<Value>;

export function deriveAtom<Value>(
  options: {
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => Promise<Value>;
    set: (arg: {
      get: <V>(a: Atom<V>) => V;
      set: <V>(a: WritableAtom<V>, v: V) => void;
    }, newValue: Value) => void | Promise<void>;
  },
): WritableAtom<Value | null>;

export function deriveAtom<Value>(
  options: {
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => NonPromise<Value>;
  },
): Atom<Value>;

export function deriveAtom<Value>(
  options: {
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => Promise<Value>;
  },
): Atom<Value | null>;

export function deriveAtom<Value>(
  options: {
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => Value | Promise<Value>;
    set?: (arg: {
      get: <V>(a: Atom<V>) => V;
      set: <V>(a: WritableAtom<V>, v: V) => void;
    }, newValue: Value) => void | Promise<void>;
  },
) {
  const atom = {
    ...options,
    default: null as Value | null,
  };
  const value = atom.get({
    get: (a) => a.default,
  });
  if (value instanceof Promise) {
    value.then((v) => {
      atom.default = v;
    });
  } else {
    atom.default = value;
  }
  return atom;
}
