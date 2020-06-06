import { SetStateAction, useCallback, useEffect } from 'react';
import { useContext } from 'use-context-selector';
import { DispatchContext } from './Provider';
import { WritableAtom } from './createAtom';

export function useAtomUpdate<Value>(atom: WritableAtom<Value>) {
  const dispatch = useContext(DispatchContext);
  const setAtom = useCallback((update: SetStateAction<Value>) => {
    dispatch({
      type: 'UPDATE_VALUE',
      atom: atom as WritableAtom<unknown>,
      update,
    });
  }, [atom, dispatch]);
  useEffect(() => {
    dispatch({ type: 'INIT_ATOM', atom });
    return () => {
      dispatch({ type: 'DISPOSE_ATOM', atom });
    };
  }, [dispatch, atom]);
  return setAtom;
}
