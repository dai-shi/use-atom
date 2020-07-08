import { Atom, WritableAtom } from '../createAtom';
import { deriveAtom } from '../deriveAtom';

type NonPromise<T> = T extends Promise<unknown> ? never : T;

export function selector<Value>(
  options: {
    key: string;
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => NonPromise<Value>;
    set: (arg: {
      get: <V>(a: Atom<V>) => V;
      set: <V>(a: WritableAtom<V>, v: V) => void;
    }, newValue: Value) => void | Promise<void>;
  },
): WritableAtom<Value>;

export function selector<Value>(
  options: {
    key: string;
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => Promise<Value>;
    set: (arg: {
      get: <V>(a: Atom<V>) => V;
      set: <V>(a: WritableAtom<V>, v: V) => void;
    }, newValue: Value) => void | Promise<void>;
  },
): WritableAtom<Value | null>;

export function selector<Value>(
  options: {
    key: string;
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => Promise<Value>;
  },
): Atom<Value | null>;

export function selector<Value>(
  options: {
    key: string;
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => Value;
  },
): Atom<Value>;

export function selector(options: unknown) {
  return deriveAtom(options as Parameters<typeof deriveAtom>[0]);
}
