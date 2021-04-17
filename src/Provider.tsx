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

const patchPromise = <Value, >(promise: Promise<Value>) => {
  promise.then((value) => {
    // eslint-disable-next-line
    (promise as any)[PROMISE_RESULT] = value;
    return value;
  }).catch((err) => {
    // eslint-disable-next-line
    (promise as any)[PROMISE_ERROR] = err;
    throw err;
  });
  return promise;
};

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

type State = {
  atoms: Map<Atom<unknown>, AtomState<unknown>>; // immutable
  pending: Map<Atom<unknown>, AtomState<unknown>>; // mutable
};

const appendMap = <K, V>(dst: Map<K, V>, src: Map<K, V>) => {
  src.forEach((v, k) => { dst.set(k, v); });
  return dst;
};

const getAtomState = <Value, >(state: State, atom: Atom<Value>) => {
  const atomState = (
    state.atoms.get(atom) || state.pending.get(atom)
  ) as AtomState<Value> | undefined;
  if (atomState) return atomState;
  try {
    const dependents = new Set<Atom<unknown>>();
    const value = atom.read(<V, >(a: Atom<V>) => {
      if (a !== atom as unknown as Atom<V>) {
        dependents.add(a);
        return readAtomValue(state, a);
      }
      if ('init' in a) return a.init as V;
      throw new Error('no atom init');
    });
    const newAtomState: AtomState<Value> = value instanceof Promise ? {
      promise: patchPromise(value),
      dependents,
    } : {
      promise: null,
      value,
      dependents,
    };
    state.pending.set(atom, newAtomState);
    return newAtomState;
  } catch (e) {
    if (e instanceof Promise) {
      const newAtomState: AtomState<Value> = {
        promise: patchPromise(e.then(() => {
          const nextAtomState = getAtomState(state, atom);
          if (nextAtomState.promise) return nextAtomState.promise;
          if ('value' in nextAtomState) return nextAtomState.value as Value;
          throw new Error('no atom value');
        })),
        dependents: new Set(),
      };
      state.pending.set(atom, newAtomState);
      return newAtomState;
    }
    throw e;
  }
};

export const readAtomValue = <Value, >(state: State, atom: Atom<Value>) => {
  const atomState = getAtomState(state, atom);
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

const initAtom = (
  prevState: State,
  atom: Atom<unknown>,
  dependent: symbol,
) => {
  const atoms = new Map(prevState.atoms);
  prevState.pending.forEach((aState, a) => {
    atoms.set(a, aState);
  });
  prevState.pending.clear();
  const atomState = atoms.get(atom);
  if (atomState) {
    const nextAtomState = {
      ...atomState,
      dependents: new Set(atomState.dependents).add(dependent),
    };
    atoms.set(atom, nextAtomState);
  } else {
    throw new Error('no atom state found to initialize');
  }
  return { ...prevState, atoms };
};

const disposeAtom = (
  prevState: State,
  dependent: Atom<unknown> | symbol,
) => {
  const atoms = new Map(prevState.atoms);
  const deleted: Atom<unknown>[] = [];
  atoms.forEach((atomState, atom) => {
    if (atomState.dependents.has(dependent)) {
      const nextGetDependents = new Set(atomState.dependents);
      nextGetDependents.delete(dependent);
      if (nextGetDependents.size) {
        atoms.set(atom, {
          ...atomState,
          dependents: nextGetDependents,
        });
      } else {
        atoms.delete(atom);
        deleted.push(atom);
      }
    }
  });
  let nextState = { ...prevState, atoms };
  nextState = deleted.reduce((p, c) => disposeAtom(p, c), nextState);
  return nextState;
};

const writeAtomValue = <Value, >(
  setState: Dispatch<SetStateAction<State>>,
  atom: WritableAtom<Value>,
  newValue: Value,
) => {
  let tasks: (() => void)[] | false = [];
  setState((prevState) => {
  });
  while (tasks.length) {
    tasks[0]();
    tasks.shift();
  }
  tasks = false;
};

const updateValue = (
  prevState: State,
  setState: Dispatch<SetStateAction<State>>,
  atom: WritableAtom<unknown>,
  update: SetStateAction<unknown>,
) => {
  const atoms = new Map(prevState.atoms);
  let isSync = true;
  const valuesToUpdate = new Map<Atom<unknown>, unknown>();
  const promises: Promise<void>[] = [];

  const getCurrAtomValue = <Value, >(atom: Atom<Value>) => {
    if (valuesToUpdate.has(atom)) {
      return valuesToUpdate.get(atom) as Value;
    }
    const atomState = atoms.get(atom) as AtomState<Value> | undefined;
    if (atomState) {
      if ('value' in atomState) return atomState.value as Value;
    }
    if ('init' in atom) {
      return atom.init as Value;
    }
    throw new Error('no atom init');
  };

  const updateDependents = (atom: Atom<unknown>) => {
    const atomState = atoms.get(atom);
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
    atom.write(
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
  const [state, setState] = useState<State>(() => ({
    atoms: new Map(),
    pending: new Map(),
  }));
  const dispatch = useCallback((action: Action) => setState((prevState) => {
    if (action.type === 'INIT_ATOM') {
      return initAtom(prevState, action.atom, action.id);
    }
    if (action.type === 'DISPOSE_ATOM') {
      return disposeAtom(prevState, action.id);
    }
    if (action.type === 'UPDATE_VALUE') {
      return updateValue(prevState, setState, action.atom, action.update);
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
