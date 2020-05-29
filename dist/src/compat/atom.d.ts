import { WritableAtom } from '../createAtom';
export declare function atom<Value>(options: {
    key: string;
    default: Value;
}): import("../createAtom").Atom<Value> & {
    set: (arg: {
        get: <V>(a: import("../createAtom").Atom<V>) => V;
        set: <V_1>(a: WritableAtom<V_1>, v: V_1) => void;
    }, newValue: Value) => void | Promise<void>;
} & {
    key: string;
};
