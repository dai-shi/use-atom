import React, { SetStateAction } from 'react';
import { Atom, WritableAtom } from './createAtom';
export declare type Suspendable<Value> = {
    promise: Promise<void> | null;
    value: Value;
};
declare type State = {
    values: Map<Atom<unknown>, Suspendable<unknown>>;
    dependents: Map<Atom<unknown>, Set<Atom<unknown>>>;
};
declare type Action = {
    type: 'INIT_ATOM';
    atom: Atom<unknown>;
} | {
    type: 'UPDATE_VALUE';
    atom: WritableAtom<unknown>;
    update: SetStateAction<unknown>;
} | {
    type: 'SET_VALUE';
    atom: WritableAtom<unknown>;
    value: unknown;
} | {
    type: 'ADD_DEPENDENTS';
    deps: {
        atom: Atom<unknown>;
        dependent: Atom<unknown>;
    }[];
} | {
    type: 'UPDATE_DEPENDENTS';
    atom: Atom<unknown>;
};
export declare const DispatchContext: React.Context<React.Dispatch<Action>>;
export declare const StateContext: React.Context<State>;
export declare const Provider: React.FC;
export {};
