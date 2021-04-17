import { useCallback, useEffect } from 'react';
import { useContext, useContextSelector } from 'use-context-selector';

import { StateContext, DispatchContext, AtomState } from './Provider';
import { Atom } from './atom';

export function useAtomValue<Value>(atom: Atom<Value>) {
  const dispatch = useContext(DispatchContext);
  const value = useContextSelector(StateContext, useCallback((state) => {
    const atomState = state.get(atom) as AtomState<Value> | undefined;
    if (!atomState) {
      if ('init' in atom) return atom.init as Value;
      throw new Error('no atom init');
    }
    if (atomState.promise) throw atomState.promise;
    if ('value' in atomState) return atomState.value as Value;
    throw new Error('no atom value');
  }, [atom]));
  useEffect(() => {
    const id = Symbol();
    dispatch({ type: 'INIT_ATOM', atom, id });
    return () => {
      dispatch({ type: 'DISPOSE_ATOM', atom, id });
    };
  }, [dispatch, atom]);
  return value;
}
