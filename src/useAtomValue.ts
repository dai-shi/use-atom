import { useCallback, useEffect } from 'react';
import { useContext, useContextSelector } from 'use-context-selector';
import type { Atom } from 'jotai/vanilla';
import { StateContext, DispatchContext, getAtomState } from './Provider';

export function useAtomValue<Value>(atom: Atom<Value>) {
  const dispatch = useContext(DispatchContext);
  const atomState = useContextSelector(
    StateContext,
    useCallback((state) => getAtomState(state, atom), [atom]),
  );
  useEffect(() => {
    if (!atomState.dependents) {
      dispatch({ type: 'COMMIT_ATOM', atom, atomState });
    }
  });
  useEffect(() => {
    const id = Symbol();
    dispatch({ type: 'INIT_ATOM', atom, id });
    return () => {
      dispatch({ type: 'DISPOSE_ATOM', atom, id });
    };
  }, [dispatch, atom]);
  return atomState.value;
}
