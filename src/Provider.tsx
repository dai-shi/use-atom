import React, {
  Dispatch,
  ReactNode,
  useCallback,
  useState,
} from 'react';
import { createContext } from 'use-context-selector';
import type { Atom, WritableAtom } from 'jotai/vanilla';

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

type CommitAction = {
  type: 'COMMIT_ATOM';
  atom: Atom<unknown>;
  atomState: AtomState<unknown>;
};

type SetAction = {
  type: 'SET_ATOM';
  atom: WritableAtom<unknown, unknown[], void>;
  args: unknown[];
};

type Action = InitAction | DisposeAction | CommitAction | SetAction;

type AtomState<Value> = {
  value: Value;
  dependencies: Set<Atom<unknown>>;
  dependents?: Set<Atom<unknown> | symbol>; // symbol is id from INIT_ATOM
};

type State = Map<Atom<unknown>, AtomState<unknown>>; // immutable map

export const getAtomState = <Value, >(state: State, atom: Atom<Value>) => {
  const atomState = state.get(atom) as AtomState<Value> | undefined;
  if (atomState) return atomState;
  const dependencies = new Set<Atom<unknown>>();
  const options = {
    get signal(): AbortSignal {
      throw new Error('signal is not supported');
    },
    get setSelf(): never {
      throw new Error('setSelf is not supported');
    },
  };
  const value = atom.read(<V, >(a: Atom<V>) => {
    if (a !== atom as unknown as Atom<V>) {
      dependencies.add(a);
      const aState = getAtomState(state, a);
      return aState.value;
    }
    if ('init' in a) return a.init as V;
    throw new Error('no atom init');
  }, options);
  const newAtomState: AtomState<Value> = { value, dependencies };
  return newAtomState;
};

const initAtom = (
  prevState: State,
  atom: Atom<unknown>,
  dependent: symbol,
) => {
  const atomState = prevState.get(atom);
  if (!atomState) {
    throw new Error('no atom state found to initialize');
  }
  const nextAtomState = {
    ...atomState,
    dependents: new Set(atomState.dependents).add(dependent),
  };
  return new Map(prevState).set(atom, nextAtomState);
};

const disposeAtom = (
  prevState: State,
  dependent: Atom<unknown> | symbol,
) => {
  let nextState = new Map(prevState);
  const deleted: Atom<unknown>[] = [];
  nextState.forEach((atomState, atom) => {
    if (atomState.dependents?.has(dependent)) {
      const nextDependents = new Set(atomState.dependents);
      nextDependents.delete(dependent);
      if (nextDependents.size) {
        nextState.set(atom, {
          ...atomState,
          dependents: nextDependents,
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

const computeDependents = (
  prevState: State,
  atom: Atom<unknown>,
  atomState: AtomState<unknown>,
) => {
  const prevAtomState = prevState.get(atom);
  let nextState = new Map(prevState);
  if (prevAtomState?.dependents && !atomState.dependents) {
    // eslint-disable-next-line no-param-reassign
    atomState.dependents = prevAtomState.dependents; // copy dependents
  }
  nextState.set(atom, atomState);
  const deleted: Atom<unknown>[] = [];
  const prevDependencies = new Set(prevAtomState?.dependencies);
  atomState.dependencies.forEach((dependency) => {
    if (prevDependencies.has(dependency)) {
      prevDependencies.delete(dependency);
    } else {
      const dependencyState = getAtomState(nextState, dependency);
      const nextDependencyState: AtomState<unknown> = {
        ...dependencyState,
        dependents: new Set(dependencyState.dependents).add(atom),
      };
      nextState.set(dependency, nextDependencyState);
    }
  });
  prevDependencies.forEach((deletedDependency) => {
    const dependencyState = getAtomState(nextState, deletedDependency);
    const dependents = new Set(dependencyState.dependents);
    dependents.delete(atom);
    if (dependents.size) {
      const nextDependencyState: AtomState<unknown> = {
        ...dependencyState,
        dependents,
      };
      nextState.set(deletedDependency, nextDependencyState);
    } else {
      deleted.push(deletedDependency);
    }
  });
  nextState = deleted.reduce((p, c) => disposeAtom(p, c), nextState);
  return nextState;
};

const commitAtom = (
  prevState: State,
  atom: Atom<unknown>,
  atomState: AtomState<unknown>,
) => {
  if (atomState.dependents) {
    return prevState;
  }
  return computeDependents(prevState, atom, atomState);
};

const setAtom = <Value, Args extends unknown[]>(
  prevState: State,
  updatingAtom: WritableAtom<Value, Args, void>,
  args: Args,
) => {
  let nextState = new Map(prevState);

  const updateDependents = (atom: Atom<unknown>) => {
    const atomState = nextState.get(atom);
    if (!atomState) return;
    atomState.dependents?.forEach((dependent) => {
      if (typeof dependent === 'symbol') return;
      const prevDependentState = nextState.get(dependent);
      nextState.delete(dependent); // clear to re-evaluate
      const dependentState = getAtomState(nextState, dependent);
      if (prevDependentState) {
        nextState.set(dependent, prevDependentState); // restore it
      }
      nextState = computeDependents(nextState, dependent, dependentState);
      updateDependents(dependent);
    });
  };

  const updateAtomValue = <Val, Ags extends unknown[], Res>(
    atom: WritableAtom<Val, Ags, Res>,
    ...ags: Ags
  ): Res => atom.write(
    <V, >(a: Atom<V>) => getAtomState(nextState, a).value,
    <V, As extends unknown[], R>(a: WritableAtom<V, As, R>, ...as: As) => {
      if ((a as unknown) === atom) {
        const atomState = nextState.get(atom);
        const nextAtomState: AtomState<unknown> = {
          dependencies: new Set(),
          dependents: new Set(),
          ...atomState,
          value: as[0],
        };
        nextState = computeDependents(nextState, atom, nextAtomState);
        updateDependents(atom);
        return undefined as R;
      }
      return updateAtomValue(a as WritableAtom<unknown, unknown[], unknown>, ...as) as R;
    },
    ...ags,
    );

  updateAtomValue(updatingAtom as WritableAtom<unknown, unknown[], void>, ...args);
  return nextState;
};

export const DispatchContext = createContext(warningObject as Dispatch<Action>);
export const StateContext = createContext(warningObject as State);

export const Provider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<State>(() => new Map());
  const dispatch = useCallback((action: Action) => setState((prevState) => {
    if (action.type === 'INIT_ATOM') {
      return initAtom(prevState, action.atom, action.id);
    }
    if (action.type === 'DISPOSE_ATOM') {
      return disposeAtom(prevState, action.id);
    }
    if (action.type === 'COMMIT_ATOM') {
      return commitAtom(prevState, action.atom, action.atomState);
    }
    if (action.type === 'SET_ATOM') {
      return setAtom(prevState, action.atom, action.args);
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
