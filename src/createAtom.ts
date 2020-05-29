export type Atom<Value> = {
  default: Value;
  get: (arg: {
    get: <V>(a: Atom<V>) => V;
  }) => Value | Promise<Value>;
}

export type WritableAtom<Value> = Atom<Value> & {
  set: (arg: {
    get: <V>(a: Atom<V>) => V;
    set: <V>(a: WritableAtom<V>, v: V) => void;
  }, newValue: Value) => void | Promise<void>;
}

export function createAtom<Value>(
  options: { default: Value },
): WritableAtom<Value> {
  const atom: WritableAtom<Value> = {
    ...options,
    get: (arg) => arg.get(atom),
    set: (arg, newValue) => arg.set(atom, newValue),
  };
  return atom;
}
