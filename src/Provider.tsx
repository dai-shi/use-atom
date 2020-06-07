import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useState,
} from 'react';
import { createContext } from 'use-context-selector';

import { Atom, WritableAtom } from './createAtom';

const warningObject = new Proxy({}, {
  get() { throw new Error('Please use <Provider>'); },
  apply() { throw new Error('Please use <Provider>'); },
});

type InitAction = {
  type: 'INIT_ATOM';
  atom: Atom<unknown>;
};

type DisposeAction = {
  type: 'DISPOSE_ATOM';
  atom: Atom<unknown>;
};

type UpdateAction = {
  type: 'UPDATE_VALUE';
  atom: WritableAtom<unknown>;
  update: SetStateAction<unknown>;
};

type Action = InitAction | DisposeAction | UpdateAction;

type ExtendablePromise<T> = {
  pending: (() => Promise<T>)[];
  promise: Promise<T>;
};

export type AtomState<Value> = {
  extendablePromise: ExtendablePromise<void> | null;
  value: Value; // this is mutable just once when promise is resolved
  used: number; // how many hooks are using
};

type State = Map<Atom<unknown>, AtomState<unknown>>;

const initialState: State = new Map();

const getDependents = new WeakMap<Atom<unknown>, Set<Atom<unknown>>>();
const setDependents = new WeakMap<Atom<unknown>, Set<Atom<unknown>>>();

const addGetDependent = (atom: Atom<unknown>, dependent: Atom<unknown>) => {
  let dependents = getDependents.get(atom);
  if (!dependents) {
    dependents = new Set();
    getDependents.set(atom, dependents);
  }
  dependents.add(dependent);
};

const addSetDependent = (atom: Atom<unknown>, dependent: Atom<unknown>) => {
  let dependents = setDependents.get(atom);
  if (!dependents) {
    dependents = new Set();
    setDependents.set(atom, dependents);
  }
  dependents.add(dependent);
};

const getAllDependents = (
  atom: Atom<unknown>,
) => {
  const dependents = new Set<Atom<unknown>>();
  const appendSetDependents = (a: Atom<unknown>) => {
    (setDependents.get(a) || new Set()).forEach((dependent) => {
      dependents.add(dependent);
      if (a !== dependent) {
        appendSetDependents(dependent);
      }
    });
  };
  appendSetDependents(atom);
  const appendGetDependents = (a: Atom<unknown>) => {
    (getDependents.get(a) || new Set()).forEach((dependent) => {
      dependents.add(dependent);
      appendGetDependents(dependent);
    });
  };
  Array.from(dependents).forEach(appendGetDependents);
  return dependents;
};

const getAtomStateValue = (state: State, a: Atom<unknown>) => {
  const atomState = state.get(a);
  return atomState ? atomState.value : a.default;
};

const setNewAtomValue = (
  setState: Dispatch<SetStateAction<State>>,
  atom: Atom<unknown>,
  value: unknown,
) => {
  setState((prev) => {
    const atomState = prev.get(atom);
    if (!atomState) {
      throw new Error('atom is not initialized');
    }
    return new Map(prev).set(atom, {
      ...atomState,
      extendablePromise: null,
      value,
    });
  });
};


const initAtomState = (
  state: State,
  setState: Dispatch<SetStateAction<State>>,
  atom: Atom<unknown>,
) => {
  const nextValue = atom.get({
    get: (a: Atom<unknown>) => {
      if (a !== atom) {
        addGetDependent(a, atom);
      }
      return getAtomStateValue(state, a);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  let atomState: AtomState<unknown>;
  if (nextValue instanceof Promise) {
    const extendablePromise: ExtendablePromise<void> = {
      pending: [],
      promise: new Promise<void>((resolve, reject) => {
        let finalValue: unknown;
        nextValue
          .then((v) => {
            finalValue = v;
          })
          .then(() => extendablePromise.pending.reduce((p, f) => p.then(f), Promise.resolve()))
          .then(() => {
            setNewAtomValue(setState, atom, finalValue);
          })
          .then(resolve)
          .catch(reject);
      }),
    };
    atomState = {
      extendablePromise,
      value: atom.default,
      used: 1,
    };
  } else {
    atomState = {
      extendablePromise: null,
      value: nextValue,
      used: 1,
    };
  }
  return atomState;
};

const updateValue = (
  prevState: State,
  setState: Dispatch<SetStateAction<State>>,
  action: UpdateAction,
) => {
  const nextState = new Map(prevState);
  const getValue = (a: Atom<unknown>) => getAtomStateValue(nextState, a);
  const nextValue = typeof action.update === 'function' ? (
    action.update(getValue(action.atom))
  ) : (
    action.update
  );
  const atomState = nextState.get(action.atom);
  if (!atomState) {
    throw new Error('atom is not initialized');
  }
  let nextAtomState: AtomState<unknown> | null = { ...atomState };
  const promises: Promise<void>[] = [];
  const setValue = (atom: WritableAtom<unknown>, value: unknown) => {
    const promise = atom.set({
      get: getValue,
      set: (a: WritableAtom<unknown>, v: unknown) => {
        addSetDependent(a, action.atom);
        if (a === action.atom) {
          if (nextAtomState) {
            nextAtomState.value = v;
          } else {
            setNewAtomValue(setState, action.atom, v);
          }
        } else {
          setValue(a, v);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, value);
    if (promise instanceof Promise) {
      promises.push(promise);
    }
  };
  setValue(action.atom, nextValue);
  const extendablePromise: ExtendablePromise<void> = {
    pending: [],
    promise: new Promise<void>((resolve, reject) => {
      Promise.all(promises)
        .then(() => extendablePromise.pending.reduce((p, f) => p.then(f), Promise.resolve()))
        .then(resolve)
        .catch(reject);
    }),
  };
  nextAtomState.extendablePromise = extendablePromise;
  nextState.set(action.atom, nextAtomState);
  const allDependents = getAllDependents(action.atom);
  const updateDependents = (atom: Atom<unknown>) => {
    const dependents = getDependents.get(atom) || new Set();
    if (dependents.size === 0) {
      return;
    }
    dependents.forEach((dependent) => {
      const v = dependent.get({
        get: (a: Atom<unknown>) => {
          if (a !== dependent) {
            addGetDependent(a, dependent);
          }
          return getAtomStateValue(nextState, a);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      const dependentState = nextState.get(dependent);
      if (!dependentState) {
        throw new Error('atom is not initialized');
      }
      const nextDependentState = { ...dependentState };
      if (v instanceof Promise) {
        nextDependentState.extendablePromise = extendablePromise;
        extendablePromise.pending.push(async () => {
          setNewAtomValue(setState, dependent, await v);
        });
      } else {
        nextDependentState.value = v;
      }
      nextState.set(dependent, nextDependentState);
      allDependents.delete(dependent);
      updateDependents(dependent);
    });
  };
  updateDependents(action.atom);
  if (!promises.length && !extendablePromise.pending.length) {
    nextAtomState.extendablePromise = null;
    allDependents.delete(action.atom);
  } else {
    const finalValue = nextAtomState.value;
    extendablePromise.promise.then(() => {
      setNewAtomValue(setState, action.atom, finalValue);
    });
  }
  allDependents.forEach((dependent) => {
    const dependentState = nextState.get(dependent);
    if (!dependentState) {
      throw new Error('atom is not initialized');
    }
    nextState.set(dependent, { ...dependentState, extendablePromise });
  });
  nextAtomState = null;
  return { nextState, extendablePromise };
};

export const DispatchContext = createContext(warningObject as Dispatch<Action>);
export const StateContext = createContext(warningObject as State);

export const Provider: React.FC = ({ children }) => {
  const [state, setState] = useState(initialState);
  const dispatch = useCallback((action: Action) => setState((prevState) => {
    if (action.type === 'INIT_ATOM') {
      let atomState = prevState.get(action.atom);
      if (!atomState) {
        atomState = initAtomState(prevState, setState, action.atom);
      } else {
        atomState = {
          ...atomState,
          used: atomState.used + 1,
        };
      }
      return new Map(prevState).set(action.atom, atomState);
    }
    if (action.type === 'DISPOSE_ATOM') {
      let atomState = prevState.get(action.atom);
      if (!atomState) {
        throw new Error('atom is not initialized');
      }
      if (atomState.used === 1) {
        const nextState = new Map(prevState);
        nextState.delete(action.atom);
        return nextState;
      }
      atomState = {
        ...atomState,
        used: atomState.used - 1,
      };
      return new Map(prevState).set(action.atom, atomState);
    }
    if (action.type === 'UPDATE_VALUE') {
      const atomState = prevState.get(action.atom);
      if (!atomState) {
        throw new Error('atom is not initialized');
      }
      if (atomState.extendablePromise) {
        atomState.extendablePromise.pending.push(async () => {
          let promiseToWait = Promise.resolve();
          setState((prev) => {
            const { nextState, extendablePromise } = updateValue(prev, setState, action);
            promiseToWait = extendablePromise.promise;
            return nextState;
          });
          await promiseToWait;
        });
        return prevState;
      }
      const { nextState } = updateValue(prevState, setState, action);
      return nextState;
    }
    throw new Error('unexpected action type');
  }), []);
  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>
        {children}
      </StateContext.Provider>
    </DispatchContext.Provider>
  );
};
