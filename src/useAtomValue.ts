import { useCallback, useEffect } from 'react';
import { useContext, useContextSelector } from 'use-context-selector';

import { StateContext, DispatchContext, AtomState } from './Provider';
import { Atom } from './createAtom';

export function useAtomValue<Value>(atom: Atom<Value>) {
  const dispatch = useContext(DispatchContext);
  const atomState = useContextSelector(StateContext, useCallback((state) => (
    state.get(atom) as AtomState<Value> | undefined
  ), [atom]));
  useEffect(() => {
    dispatch({ type: 'INIT_ATOM', atom });
    return () => {
      dispatch({ type: 'DISPOSE_ATOM', atom });
    };
  }, [dispatch, atom]);
  if (atomState && atomState.extendablePromise) {
    throw atomState.extendablePromise.promise;
  }
  return atomState === undefined ? atom.default : atomState.value;
}
