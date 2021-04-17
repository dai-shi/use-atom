import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useState,
} from 'react';
import { createContext } from 'use-context-selector';

import { Atom, WritableAtom } from './atom';

const PROMISE_RESULT = Symbol();
const PROMISE_ERROR = Symbol();

const warningObject = new Proxy({}, {
  get() { throw new Error('Please use <Provider>'); },
  apply() { throw new Error('Please use <Provider>'); },
});

type InitAction = {
  type: 'INIT_ATOM';
  atom: Atom<unknown>;
  id: symbol;
};

type DisposeAction = {
  type: 'DISPOSE_ATOM';
  atom: Atom<unknown>;
  id: symbol;
};

type UpdateAction = {
  type: 'UPDATE_VALUE';
  atom: WritableAtom<unknown>;
  update: SetStateAction<unknown>;
};

type Action = InitAction | DisposeAction | UpdateAction;

type AtomState<Value> = {
  promise: Promise<Value> | null;
  value?: Value;
  dependents: Set<Atom<unknown> | symbol>; // symbol is id from INIT_ATOM
};

type State = Map<Atom<unknown>, AtomState<unknown>>;

const initialState: State = new Map();

const getAtomState = <Value, >(state: State, atom: Atom<Value>) => {
  const atomState = state.get(atom) as AtomState<Value> | undefined;
  if (!atomState) {
    throw new Error('atom is not initialized');
  }
  return atomState;
};

export const getAtomStateValue = <Value, >(state: State, atom: Atom<Value>) => {
  const atomState = state.get(atom) as AtomState<Value> | undefined;
  if (!atomState) {
    if ('init' in atom) return atom.init as Value;
    throw new Error('no atom init');
  }
  if (atomState.promise) {
    const {
      [PROMISE_RESULT]: result,
      [PROMISE_ERROR]: error,
    } = atomState.promise as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (error) throw error;
    if (result) return result as Value;
    throw atomState.promise;
  }
  if ('value' in atomState) return atomState.value as Value;
  throw new Error('no atom value');
};

function appendMap<K, V>(dst: Map<K, V>, src: Map<K, V>) {
  src.forEach((v, k) => {
    dst.set(k, v);
  });
  return dst;
}

const initAtom = (
  prevState: State,
  setState: Dispatch<SetStateAction<State>>,
  atom: Atom<unknown>,
  dependent: Atom<unknown> | symbol,
) => {
  let atomState = prevState.get(atom);
  if (atomState) {
    const nextAtomState = {
      ...atomState,
      dependents: new Set(atomState.dependents).add(dependent),
    };
    return new Map().set(atom, nextAtomState);
  }
  const updateState: State = new Map();
  let isSync = true;
  const nextValue = atom.read(<V, >(a: Atom<V>) => {
    if (a !== atom) {
      if (isSync) {
        appendMap(updateState, initAtom(prevState, setState, a, atom));
      } else {
        setState((prev) => appendMap(
          new Map(prev),
          initAtom(prev, setState, a, atom),
        ));
      }
    }
    return getAtomStateValue(prevState, a);
  });
  if (nextValue instanceof Promise) {
    const promise = nextValue.then((value) => {
      setState((prev) => new Map(prev).set(atom, {
        ...getAtomState(prev, atom),
        value,
      }));
    });
    atomState = {
      promise,
      dependents: new Set(),
    };
  } else {
    atomState = {
      promise: null,
      value: nextValue,
      dependents: new Set(),
    };
  }
  atomState.dependents.add(dependent);
  updateState.set(atom, atomState);
  isSync = false;
  return updateState;
};

const disposeAtom = (
  prevState: State,
  dependent: Atom<unknown> | symbol,
) => {
  let nextState = new Map(prevState);
  const deleted: Atom<unknown>[] = [];
  nextState.forEach((atomState, atom) => {
    if (atomState.dependents.has(dependent)) {
      const nextGetDependents = new Set(atomState.dependents);
      nextGetDependents.delete(dependent);
      if (nextGetDependents.size) {
        nextState.set(atom, {
          ...atomState,
          dependents: nextGetDependents,
        });
      } else {
        nextState.delete(atom);
        deleted.push(atom);
      }
    }
  });
  nextState = deleted.reduce((p, c) => disposeAtom(p, c), nextState);
  return nextState;
};

const updateValue = (
  prevState: State,
  setState: Dispatch<SetStateAction<State>>,
  action: UpdateAction,
) => {
  const nextState = new Map(prevState);
  let isSync = true;
  const valuesToUpdate = new Map<Atom<unknown>, unknown>();
  const promises: Promise<void>[] = [];

  const getCurrAtomValue = <Value, >(atom: Atom<Value>) => {
    if (valuesToUpdate.has(atom)) {
      return valuesToUpdate.get(atom) as Value;
    }
    const atomState = nextState.get(atom) as AtomState<Value> | undefined;
    if (atomState) {
      if ('value' in atomState) return atomState.value as Value;
    }
    if ('init' in atom) {
      return atom.init as Value;
    }
    throw new Error('no atom init');
  };

  const updateDependents = (atom: Atom<unknown>) => {
    const atomState = nextState.get(atom);
    if (!atomState) return;
    atomState.dependents.forEach((dependent) => {
      if (typeof dependent === 'symbol') return;
      const v = dependent.read(<V, >(a: Atom<V>) => {
        if (a !== dependent) {
          if (isSync) {
            appendMap(nextState, initAtom(prevState, setState, a, dependent));
          } else {
            setState((prev) => appendMap(
              new Map(prev),
              initAtom(prev, setState, a, dependent),
            ));
          }
        }
        return getCurrAtomValue(a);
      });
      if (v instanceof Promise) {
        promises.push(v.then((vv) => {
          valuesToUpdate.set(dependent, vv);
        }));
      } else {
        valuesToUpdate.set(dependent, v);
      }
      updateDependents(dependent);
    });
  };

  const updateAtomValue = (atom: Atom<unknown>, value: unknown) => {
    valuesToUpdate.set(atom, value);
    updateDependents(atom);
  };

  const setValue = <Value, >(atom: WritableAtom<Value>, value: Value) => {
    const promise = atom.write(
      getCurrAtomValue,
      <V, >(a: WritableAtom<V>, v: V) => {
        if (a === atom as unknown as WritableAtom<V>) {
          updateAtomValue(atom, v);
        } else {
          setValue(a, v);
        }
      },
      value,
    );
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
      setState((prev) => {
        const nextS = new Map(prev);
        valuesToUpdate.forEach((value, atom) => {
          const atomState = getAtomState(nextS, atom);
          nextS.set(atom, { ...atomState, promise: null, value });
        });
        return nextS;
      });
    }
  };
  const promise = resolve();

  if (hasPromises) {
    promise.then(() => {
      const atomState = getAtomState(nextState, action.atom);
      nextState.set(action.atom, { ...atomState, promise: null });
    });
    const atomState = getAtomState(nextState, action.atom);
    nextState.set(action.atom, { ...atomState, promise });
  }
  valuesToUpdate.forEach((value, atom) => {
    const atomState = getAtomState(nextState, atom);
    nextState.set(atom, { ...atomState, promise: null, value });
  });
  valuesToUpdate.clear();
  isSync = false;
  return nextState;
};

export const DispatchContext = createContext(warningObject as Dispatch<Action>);
export const StateContext = createContext(warningObject as State);

export const Provider: React.FC = ({ children }) => {
  const [state, setState] = useState(initialState);
  const dispatch = useCallback((action: Action) => setState((prevState) => {
    if (action.type === 'INIT_ATOM') {
      const updateState = initAtom(prevState, setState, action.atom, action.id);
      return appendMap(new Map(prevState), updateState);
    }
    if (action.type === 'DISPOSE_ATOM') {
      return disposeAtom(prevState, action.id);
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
