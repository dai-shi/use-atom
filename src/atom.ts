export type Atom<Value> = {
  init?: Value;
  read: (get: <V>(a: Atom<V>) => V) => Value | Promise<Value>;
}

export type WritableAtom<Value> = Atom<Value> & {
  write: (
    get: <V>(a: Atom<V>) => V,
    set: <V>(a: WritableAtom<V>, v: V) => void,
    newValue: Value
  ) => void;
}

export function atom<Value>(
  read: (get: <V>(a: Atom<V>) => V) => Value | Promise<Value>,
  write: (
    get: <V>(a: Atom<V>) => V,
    set: <V>(a: WritableAtom<V>, v: V) => void,
    newValue: Value,
  ) => void,
): WritableAtom<Value>;

export function atom<Value>(
  read: (get: <V>(a: Atom<V>) => V) => Value | Promise<Value>,
): Atom<Value>;

export function atom<Value>(
  initialValue: Value,
): WritableAtom<Value>;

export function atom<Value>(
  read: Value | ((get: <V>(a: Atom<V>) => V) => Promise<Value>),
  write?: (
    get: <V>(a: Atom<V>) => V,
    set: <V>(a: WritableAtom<V>, v: V) => void,
    newValue: Value,
  ) => void,
) {
  if (typeof read !== 'function') {
    const a: WritableAtom<Value> = {
      init: read,
      read: (get) => get(a),
      write: (_get, set, newValue) => set(a, newValue),
    };
    return a;
  }
  if (write) {
    const a: WritableAtom<Value> = {
      read: (get) => get(a),
      write: (_get, set, newValue) => set(a, newValue),
    };
    return a;
  }
  const a: Atom<Value> = {
    read: (get) => get(a),
  };
  return a;
}
