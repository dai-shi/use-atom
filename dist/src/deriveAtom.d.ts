import { Atom, WritableAtom } from './createAtom';
export declare function deriveAtom<Value>(options: {
    get: (arg: {
        get: <V>(a: Atom<V>) => V;
    }) => Value | Promise<Value>;
    set: (arg: {
        get: <V>(a: Atom<V>) => V;
        set: <V>(a: WritableAtom<V>, v: V) => void;
    }, newValue: Value) => void | Promise<void>;
}): WritableAtom<Value | null>;
export declare function deriveAtom<Value>(options: {
    get: (arg: {
        get: <V>(a: Atom<V>) => V;
    }) => Value | Promise<Value>;
}): Atom<Value | null>;
