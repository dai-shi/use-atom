import { useCallback, useEffect } from 'react';
import { useContext, useContextSelector } from 'use-context-selector';

import { StateContext, DispatchContext, Suspendable } from './Provider';
import { Atom } from './createAtom';

export function useAtomValue<Value>(atom: Atom<Value>) {
  const dispatch = useContext(DispatchContext);
  const suspendable = useContextSelector(StateContext, useCallback((state) => (
    state.values.get(atom) as Suspendable<Value> | undefined
  ), [atom]));
  useEffect(() => {
    dispatch({ type: 'INIT_ATOM', atom });
  }, [dispatch, atom]);
  if (suspendable && suspendable.promise) {
    throw suspendable.promise;
  }
  return suspendable === undefined ? atom.default : suspendable.value;
}
