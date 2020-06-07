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

export type AtomState<Value> = {
  promise: Promise<void> | null;
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

const getAtomState = (state: State, atom: Atom<unknown>) => {
  const atomState = state.get(atom);
  if (!atomState) {
    throw new Error('atom is not initialized');
  }
  return atomState;
};

const getAtomStateValue = (state: State, atom: Atom<unknown>) => {
  const atomState = state.get(atom);
  return atomState ? atomState.value : atom.default;
};

const setNewAtomValue = (
  setState: Dispatch<SetStateAction<State>>,
  atom: Atom<unknown>,
  value: unknown,
) => {
  setState((prev) => {
    const atomState = getAtomState(prev, atom);
    return new Map(prev).set(atom, {
      ...atomState,
      promise: null,
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
    const promise = nextValue
      .then((v) => {
        setNewAtomValue(setState, atom, v);
      });
    atomState = {
      promise,
      value: atom.default,
      used: 1,
    };
  } else {
    atomState = {
      promise: null,
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
  let currState = prevState;
  const valuesToUpdate = new Map<Atom<unknown>, unknown>();
  const promises: Promise<void>[] = [];
  const allDependents = getAllDependents(action.atom);

  const getCurrAtomValue = (atom: Atom<unknown>) => {
    if (valuesToUpdate.has(atom)) {
      return valuesToUpdate.get(atom);
    }
    const atomState = currState.get(atom);
    return atomState ? atomState.value : atom.default;
  };

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
          return getCurrAtomValue(a);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      if (v instanceof Promise) {
        promises.push(v.then((vv) => {
          valuesToUpdate.set(dependent, vv);
          allDependents.delete(dependent);
        }));
      } else {
        valuesToUpdate.set(dependent, v);
        allDependents.delete(dependent);
      }
      updateDependents(dependent);
    });
  };

  const updateAtomValue = (atom: Atom<unknown>, value: unknown) => {
    valuesToUpdate.set(atom, value);
    allDependents.delete(atom);
    updateDependents(atom);
  };

  const setValue = (atom: WritableAtom<unknown>, value: unknown) => {
    const promise = atom.set({
      get: getCurrAtomValue,
      set: (a: WritableAtom<unknown>, v: unknown) => {
        addSetDependent(a, atom);
        if (a === atom) {
          updateAtomValue(atom, v);
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

  const nextValue = typeof action.update === 'function' ? (
    action.update(getCurrAtomValue(action.atom))
  ) : (
    action.update
  );
  setValue(action.atom, nextValue);

  const hasPromises = promises.length > 0;
  const resolve = async () => {
    if (promises.length) {
      const promisesToWait = promises.splice(0, promises.length);
      await Promise.all(promisesToWait);
      await resolve();
    } else {
      if (allDependents.size !== 0) {
        throw new Error('allDependents is not empty, maybe a bug');
      }
      setState((prev) => {
        const nextState = new Map(prev);
        valuesToUpdate.forEach((value, atom) => {
          const atomState = getAtomState(nextState, atom);
          nextState.set(atom, { ...atomState, promise: null, value });
        });
        return nextState;
      });
    }
  };
  const promise = resolve();

  const nextState = new Map(currState);
  if (hasPromises) {
    promise.then(() => {
      const atomState = getAtomState(nextState, action.atom);
      nextState.set(action.atom, { ...atomState, promise: null });
    });
    const atomState = getAtomState(nextState, action.atom);
    nextState.set(action.atom, { ...atomState, promise });
  }
  allDependents.forEach((dependent) => {
    const dependentState = getAtomState(nextState, dependent);
    nextState.set(dependent, { ...dependentState, promise });
  });
  valuesToUpdate.forEach((value, atom) => {
    const atomState = getAtomState(nextState, atom);
    nextState.set(atom, { ...atomState, promise: null, value });
  });
  valuesToUpdate.clear();
  currState = nextState;
  return nextState;
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
        atomState = { ...atomState, used: atomState.used + 1 };
      }
      return new Map(prevState).set(action.atom, atomState);
    }
    if (action.type === 'DISPOSE_ATOM') {
      let atomState = getAtomState(prevState, action.atom);
      if (atomState.used === 1) {
        const nextState = new Map(prevState);
        nextState.delete(action.atom);
        return nextState;
      }
      atomState = { ...atomState, used: atomState.used - 1 };
      return new Map(prevState).set(action.atom, atomState);
    }
    if (action.type === 'UPDATE_VALUE') {
      const atomState = getAtomState(prevState, action.atom);
      if (atomState.promise) {
        const promise = atomState.promise.then(() => {
          setState((prev) => {
            const nextState = updateValue(prev, setState, action);
            return nextState;
          });
        });
        return new Map(prevState).set(action.atom, { ...atomState, promise });
      }
      const nextState = updateValue(prevState, setState, action);
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
