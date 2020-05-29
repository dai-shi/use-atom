import { Atom, WritableAtom } from '../createAtom';
import { deriveAtom } from '../deriveAtom';

export function selector<Value>(
  options: {
    key: string;
    get: (arg: {
      get: <V>(a: Atom<V>) => V;
    }) => Value | Promise<Value>;
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
    }) => Value | Promise<Value>;
  },
): Atom<Value | null>;

export function selector(options: unknown) {
  return deriveAtom(options as Parameters<typeof deriveAtom>[0]);
}
