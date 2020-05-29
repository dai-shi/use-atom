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
  dependents: Map<Atom<unknown>, Set<Atom<unknown>>>;
};

const initialState: State = {
  values: new Map(),
  dependents: new Map(),
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
  }
  | {
    type: 'UPDATE_DEPENDENTS';
    atom: Atom<unknown>;
  };

export const DispatchContext = createContext(warningObject as Dispatch<Action>);
export const StateContext = createContext(warningObject as State);

export const Provider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer((prevState: State, action: Action) => {
    const currState = { ...prevState };
    let dirty = false;
    let inReducer = true;
    const addDependents = (
      deps: { atom: Atom<unknown>; dependent: Atom<unknown> }[],
    ) => {
      deps.forEach(({ atom, dependent }) => {
        const currSet = currState.dependents.get(atom) || new Set();
        if (currSet.has(dependent)) {
          return;
        }
        const dependents = new Map(currState.dependents).set(atom, currSet.add(dependent));
        currState.dependents = dependents;
        dirty = true;
      });
    };
    const getSuspendable = (atom: Atom<unknown>) => {
      // XXX too complicated
      const deps: { atom: Atom<unknown>; dependent: Atom<unknown> }[] = [];
      const nextValue = atom.get({
        get: (a: Atom<unknown>) => {
          if (a !== atom) {
            deps.push({ atom: a, dependent: atom });
          }
          const s = currState.values.get(a);
          return s ? s.value : a.default;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      let suspendable: Suspendable<unknown>;
      if (nextValue instanceof Promise) {
        const currSuspendable = currState.values.get(atom);
        const currValue = currSuspendable ? currSuspendable.value : atom.default;
        suspendable = {
          promise: nextValue.then(async (v) => {
            dispatch({ type: 'ADD_DEPENDENTS', deps });
            const promises = deps
              .map((dep) => currState.values.get(dep.atom)?.promise)
              .filter((x) => !!x);
            if (promises.length > 0) {
              await Promise.all(promises).then(async () => {
                const nextSuspendable = getSuspendable(atom);
                suspendable.value = nextSuspendable.value;
                await nextSuspendable.promise;
              });
            } else {
              suspendable.promise = null;
              suspendable.value = v;
            }
          }),
          value: currValue,
        };
      } else {
        addDependents(deps);
        const promises = deps
          .map((dep) => currState.values.get(dep.atom)?.promise)
          .filter((x) => !!x);
        if (promises.length > 0) {
          suspendable = {
            promise: Promise.all(promises).then(async () => {
              const nextSuspendable = getSuspendable(atom);
              suspendable.value = nextSuspendable.value;
              await nextSuspendable.promise;
            }),
            value: nextValue,
          };
        } else {
          suspendable = {
            promise: null,
            value: nextValue,
          };
        }
      }
      return suspendable;
    };
    const initAtom = (atom: Atom<unknown>) => {
      if (currState.values.has(atom)) {
        return;
      }
      const suspendable = getSuspendable(atom);
      const values = new Map(currState.values).set(atom, suspendable);
      currState.values = values;
      dirty = true;
    };
    const updateDependents = (atom: Atom<unknown>) => {
      const currSet = currState.dependents.get(atom) || new Set();
      if (currSet.size === 0) {
        return;
      }
      const values = new Map(currState.values);
      currSet.forEach((dependent) => {
        const suspendable = getSuspendable(dependent);
        if (suspendable.promise) {
          suspendable.promise.then(() => {
            dispatch({ type: 'UPDATE_DEPENDENTS', atom: dependent });
          });
        } else {
          updateDependents(dependent);
        }
        values.set(dependent, suspendable);
      });
      currState.values = values;
      dirty = true;
    };
    const setValue = (atom: WritableAtom<unknown>, value: unknown) => {
      const currSuspendable = currState.values.get(atom);
      const currValue = currSuspendable ? currSuspendable.value : atom.default;
      if (currValue === value) {
        return;
      }
      if (!inReducer) {
        // schedule next render
        dispatch({ type: 'SET_VALUE', atom, value });
        return;
      }
      currState.values = new Map(currState.values).set(atom, { promise: null, value });
      const promise = atom.set({
        get: (a: Atom<unknown>) => {
          const s = currState.values.get(a);
          return s ? s.value : a.default;
        },
        set: (a: WritableAtom<unknown>, v: unknown) => {
          if (a !== atom) {
            // XXX we can't make this suspendable
            // because we don't know which atom will be updated in advance.
            setValue(a, v);
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, value);
      let suspendable: Suspendable<unknown>;
      if (promise instanceof Promise) {
        suspendable = {
          promise: promise.then(async () => {
            const nextSuspendable = getSuspendable(atom);
            suspendable.value = nextSuspendable.value;
            await nextSuspendable.promise;
            suspendable.value = nextSuspendable.value;
          }),
          value: currValue,
        };
      } else {
        suspendable = getSuspendable(atom);
      }
      const values = new Map(currState.values).set(atom, suspendable);
      currState.values = values;
      dirty = true;
      updateDependents(atom);
    };
    const updateValue = (atom: WritableAtom<unknown>, update: SetStateAction<unknown>) => {
      const currSuspendable = currState.values.get(atom);
      const currValue = currSuspendable ? currSuspendable.value : atom.default;
      const nextValue = typeof update === 'function' ? update(currValue) : update;
      setValue(atom, nextValue);
    };
    switch (action.type) {
      case 'INIT_ATOM':
        initAtom(action.atom);
        break;
      case 'UPDATE_DEPENDENTS':
        updateDependents(action.atom);
        break;
      case 'SET_VALUE':
        setValue(action.atom, action.value);
        break;
      case 'UPDATE_VALUE':
        updateValue(action.atom, action.update);
        break;
      case 'ADD_DEPENDENTS':
        addDependents(action.deps);
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
