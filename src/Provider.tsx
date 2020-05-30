import React, { Dispatch, SetStateAction, useReducer } from 'react';
import { createContext } from 'use-context-selector';

import { Atom, WritableAtom } from './createAtom';

const warningObject = new Proxy({}, {
  get() { throw new Error('Please use <Provider>'); },
  apply() { throw new Error('Please use <Provider>'); },
});

export type Suspendable<Value> = {
  promise: Promise<void> | null;
  value: Value;
};

type State = {
  values: Map<Atom<unknown>, Suspendable<unknown>>;
  getDependents: Map<Atom<unknown>, Set<Atom<unknown>>>;
  setDependents: Map<Atom<unknown>, Set<Atom<unknown>>>;
};

const initialState: State = {
  values: new Map(),
  getDependents: new Map(),
  setDependents: new Map(),
};

type Action =
  | {
    type: 'INIT_ATOM';
    atom: Atom<unknown>;
  }
  | {
    type: 'UPDATE_VALUE';
    atom: WritableAtom<unknown>;
    update: SetStateAction<unknown>;
  }
  | {
    type: 'SET_VALUE';
    atom: WritableAtom<unknown>;
    value: unknown;
  }
  | {
    type: 'ADD_DEPENDENTS';
    deps: { atom: Atom<unknown>; dependent: Atom<unknown> }[];
    mode: 'get' | 'set';
  }
  | {
    type: 'UPDATE_DEPENDENTS';
    atom: Atom<unknown>;
    mode: 'get' | 'set';
  };

export const DispatchContext = createContext(warningObject as Dispatch<Action>);
export const StateContext = createContext(warningObject as State);

export const Provider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer((prevState: State, action: Action) => {
    const currState = { ...prevState };
    let dirty = false;
    let inReducer = true;

    const getCurrValue = (atom: Atom<unknown>) => {
      const suspendable = currState.values.get(atom);
      return suspendable ? suspendable.value : atom.default;
    };

    const setSuspendable = (atom: Atom<unknown>, suspendable: Suspendable<unknown>) => {
      if (currState.values === prevState.values) {
        currState.values = new Map(currState.values);
        dirty = true;
      }
      currState.values.set(atom, suspendable);
    };

    const addDependents = (
      deps: { atom: Atom<unknown>; dependent: Atom<unknown> }[],
      mode: 'get' | 'set',
    ) => {
      deps.forEach(({ atom, dependent }) => {
        const currSet = (
          mode === 'get' ? currState.getDependents : currState.setDependents
        ).get(atom) || new Set();
        if (currSet.has(dependent)) {
          return;
        }
        const dependents = new Map(
          mode === 'get' ? currState.getDependents : currState.setDependents,
        ).set(atom, currSet.add(dependent));
        if (mode === 'get') {
          currState.getDependents = dependents;
        } else {
          currState.setDependents = dependents;
        }
        dirty = true;
      });
    };

    const suspendDependents = (atom: Atom<unknown>, mode: 'get' | 'set', promise: Promise<void>) => {
      const currSet = (
        mode === 'get' ? currState.getDependents : currState.setDependents
      ).get(atom) || new Set();
      currSet.forEach((dependent) => {
        setSuspendable(dependent, {
          promise,
          value: getCurrValue(dependent),
        });
        suspendDependents(dependent, mode, promise);
      });
    };

    const getSuspendable = (atom: Atom<unknown>) => {
      const deps: { atom: Atom<unknown>; dependent: Atom<unknown> }[] = [];
      const nextValue = atom.get({
        get: (a: Atom<unknown>) => {
          if (a !== atom) {
            deps.push({ atom: a, dependent: atom });
          }
          return getCurrValue(a);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      let suspendable: Suspendable<unknown>;
      if (nextValue instanceof Promise) {
        const currValue = getCurrValue(atom);
        suspendable = {
          promise: nextValue.then(async (v) => {
            dispatch({ type: 'ADD_DEPENDENTS', deps, mode: 'get' });
            suspendable.promise = null;
            suspendable.value = v;
          }),
          value: currValue,
        };
      } else {
        addDependents(deps, 'get');
        suspendable = {
          promise: null,
          value: nextValue,
        };
      }
      return suspendable;
    };

    const initAtom = (atom: Atom<unknown>) => {
      if (currState.values.has(atom)) {
        return;
      }
      const suspendable = getSuspendable(atom);
      setSuspendable(atom, suspendable);
    };

    const updateDependents = (atom: Atom<unknown>, mode: 'get' | 'set') => {
      const currSet = (
        mode === 'get' ? currState.getDependents : currState.setDependents
      ).get(atom) || new Set();
      if (currSet.size === 0) {
        return;
      }
      currSet.forEach((dependent) => {
        const suspendable = getSuspendable(dependent);
        setSuspendable(dependent, suspendable);
        if (suspendable.promise) {
          suspendable.promise.then(() => {
            dispatch({ type: 'UPDATE_DEPENDENTS', atom: dependent, mode });
          });
        } else {
          updateDependents(dependent, 'get');
          if (mode === 'set') {
            updateDependents(dependent, 'set');
          }
        }
      });
    };

    const setValue = (atom: WritableAtom<unknown>, value: unknown) => {
      const currValue = getCurrValue(atom);
      if (currValue === value) {
        return;
      }
      if (!inReducer) {
        // schedule next render
        dispatch({ type: 'SET_VALUE', atom, value });
        return;
      }
      setSuspendable(atom, { promise: null, value });
      const deps: { atom: Atom<unknown>; dependent: Atom<unknown> }[] = [];
      const promise = atom.set({
        get: getCurrValue,
        set: (a: WritableAtom<unknown>, v: unknown) => {
          if (a !== atom) {
            deps.push({ atom: a, dependent: atom });
            setValue(a, v);
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, value);
      let suspendable: Suspendable<unknown>;
      if (promise instanceof Promise) {
        suspendDependents(atom, 'get', promise);
        suspendDependents(atom, 'set', promise);
        suspendable = {
          promise: promise.then(async () => {
            dispatch({ type: 'ADD_DEPENDENTS', deps, mode: 'set' });
            const nextSuspendable = getSuspendable(atom);
            await nextSuspendable.promise;
            suspendable.value = nextSuspendable.value;
          }),
          value: currValue,
        };
      } else {
        addDependents(deps, 'set');
        suspendable = getSuspendable(atom);
      }
      setSuspendable(atom, suspendable);
      updateDependents(atom, 'get');
    };

    const updateValue = (atom: WritableAtom<unknown>, update: SetStateAction<unknown>) => {
      const currValue = getCurrValue(atom);
      const nextValue = typeof update === 'function' ? update(currValue) : update;
      setValue(atom, nextValue);
    };

    switch (action.type) {
      case 'INIT_ATOM':
        initAtom(action.atom);
        break;
      case 'UPDATE_DEPENDENTS':
        updateDependents(action.atom, action.mode);
        break;
      case 'SET_VALUE':
        setValue(action.atom, action.value);
        break;
      case 'UPDATE_VALUE':
        updateValue(action.atom, action.update);
        break;
      case 'ADD_DEPENDENTS':
        addDependents(action.deps, action.mode);
        break;
      default:
        throw new Error('unexpected action type');
    }
    inReducer = false;
    if (dirty) {
      return currState;
    }
    return prevState;
  }, initialState);
  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>
        {children}
      </StateContext.Provider>
    </DispatchContext.Provider>
  );
};
