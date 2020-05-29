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
    type: 'NEW_VALUE';
    atom: WritableAtom<unknown>;
    value: unknown;
  }
  | {
    type: 'NEW_DEPENDENT';
    atom: Atom<unknown>;
    dependent: Atom<unknown>;
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
    const newDependent = (atom: Atom<unknown>, dependent: Atom<unknown>) => {
      if (atom === dependent) {
        return;
      }
      const currSet = currState.dependents.get(atom) || new Set();
      if (currSet.has(dependent)) {
        return;
      }
      if (!inReducer) {
        // schedule next render
        dispatch({ type: 'NEW_DEPENDENT', atom, dependent });
        return;
      }
      const dependents = new Map(currState.dependents).set(atom, currSet.add(dependent));
      currState.dependents = dependents;
      dirty = true;
    };
    const updateDependents = (atom: Atom<unknown>) => {
      const currSet = currState.dependents.get(atom) || new Set();
      if (currSet.size === 0) {
        return;
      }
      const values = new Map(currState.values);
      currSet.forEach((dependent) => {
        const currSuspendable = currState.values.get(dependent);
        const currValue = currSuspendable ? currSuspendable.value : dependent.default;
        const nextValue = dependent.get({
          get: (a: Atom<unknown>) => {
            newDependent(a, dependent);
            const s = currState.values.get(a);
            return s ? s.value : a.default;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        let suspendable: Suspendable<unknown>;
        if (nextValue instanceof Promise) {
          suspendable = {
            promise: nextValue.then((v) => {
              suspendable.promise = null;
              suspendable.value = v;
              dispatch({ type: 'UPDATE_DEPENDENTS', atom: dependent });
            }),
            value: currValue,
          };
        } else {
          suspendable = {
            promise: null,
            value: nextValue,
          };
          updateDependents(dependent);
        }
        values.set(dependent, suspendable);
      });
      currState.values = values;
      dirty = true;
    };
    const initAtom = (atom: Atom<unknown>) => {
      if (currState.values.has(atom)) {
        return;
      }
      const nextValue = atom.get({
        get: (a: Atom<unknown>) => {
          newDependent(a, atom);
          const s = currState.values.get(a);
          return s ? s.value : a.default;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      let suspendable: Suspendable<unknown>;
      if (nextValue instanceof Promise) {
        suspendable = {
          promise: nextValue.then((v) => {
            suspendable.promise = null;
            suspendable.value = v;
            dispatch({ type: 'UPDATE_DEPENDENTS', atom });
          }),
          value: atom.default,
        };
      } else {
        suspendable = {
          promise: null,
          value: nextValue,
        };
        updateDependents(atom);
      }
      const values = new Map(currState.values).set(atom, suspendable);
      currState.values = values;
      dirty = true;
    };
    const newValue = (atom: WritableAtom<unknown>, value: unknown) => {
      const currSuspendable = currState.values.get(atom);
      const currValue = currSuspendable ? currSuspendable.value : atom.default;
      if (currValue === value) {
        return;
      }
      if (!inReducer) {
        // schedule next render
        dispatch({ type: 'NEW_VALUE', atom, value });
        return;
      }
      const suspendable = {
        promise: null,
        value,
      };
      const values = new Map(currState.values).set(atom, suspendable);
      currState.values = values;
      dirty = true;
      updateDependents(atom);
    };
    const updateValue = (atom: WritableAtom<unknown>, update: SetStateAction<unknown>) => {
      const currSuspendable = currState.values.get(atom);
      const currValue = currSuspendable ? currSuspendable.value : atom.default;
      const nextValue = typeof update === 'function' ? update(currValue) : update;
      atom.set({
        get: (a: Atom<unknown>) => {
          const s = currState.values.get(a);
          return s ? s.value : a.default;
        },
        set: (a: WritableAtom<unknown>, v: unknown) => {
          newValue(a, v);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, nextValue);
    };
    switch (action.type) {
      case 'INIT_ATOM':
        initAtom(action.atom);
        break;
      case 'UPDATE_DEPENDENTS':
        updateDependents(action.atom);
        break;
      case 'NEW_VALUE':
        newValue(action.atom, action.value);
        break;
      case 'UPDATE_VALUE':
        updateValue(action.atom, action.update);
        break;
      case 'NEW_DEPENDENT':
        newDependent(action.atom, action.dependent);
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
