import { useCallback, useEffect } from 'react';
import { useContext, useContextSelector } from 'use-context-selector';

import { StateContext, DispatchContext, AtomState } from './Provider';
import { Atom } from './createAtom';

export function useAtomValue<Value>(atom: Atom<Value>) {
  const dispatch = useContext(DispatchContext);
  const promiseOrValue = useContextSelector(StateContext, useCallback((state) => {
    const atomState = state.get(atom) as AtomState<Value> | undefined;
    if (!atomState) return atom.default;
    if (atomState.promise) return atomState.promise;
    return atomState.value;
  }, [atom]));
  useEffect(() => {
    const id = Symbol();
    dispatch({ type: 'INIT_ATOM', atom, id });
    return () => {
      dispatch({ type: 'DISPOSE_ATOM', atom, id });
    };
  }, [dispatch, atom]);
  if (promiseOrValue instanceof Promise) {
    throw promiseOrValue;
  }
  return promiseOrValue;
}
