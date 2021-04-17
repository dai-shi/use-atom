import { useCallback, useEffect } from 'react';
import { useContext, useContextSelector } from 'use-context-selector';

import { StateContext, DispatchContext, readAtomValue } from './Provider';
import { Atom } from './atom';

export function useAtomValue<Value>(atom: Atom<Value>) {
  const dispatch = useContext(DispatchContext);
  const value = useContextSelector(
    StateContext,
    useCallback((state) => readAtomValue(state, atom), [atom]),
  );
  useEffect(() => {
    const id = Symbol();
    dispatch({ type: 'INIT_ATOM', atom, id });
    return () => {
      dispatch({ type: 'DISPOSE_ATOM', atom, id });
    };
  }, [dispatch, atom]);
  return value;
}
