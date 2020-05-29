export declare type Atom<Value> = {
    default: Value;
    get: (arg: {
        get: <V>(a: Atom<V>) => V;
    }) => Value | Promise<Value>;
};
export declare type WritableAtom<Value> = Atom<Value> & {
    set: (arg: {
        get: <V>(a: Atom<V>) => V;
        set: <V>(a: WritableAtom<V>, v: V) => void;
    }, newValue: Value) => void | Promise<void>;
};
export declare function createAtom<Value>(options: {
    default: Value;
}): WritableAtom<Value>;
