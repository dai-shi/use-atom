import { SetStateAction, useCallback } from 'react';
import { useContext, useContextUpdate } from 'use-context-selector';
import { StateContext, DispatchContext } from './Provider';
import { Atom, WritableAtom } from './atom';

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>,
): atom is WritableAtom<Value, Update> => !!(atom as WritableAtom<Value, Update>).write;

export function useSetAtom<Value, Update>(atom: WritableAtom<Value, Update>) {
  const dispatch = useContext(DispatchContext);
  const updateState = useContextUpdate(StateContext);
  const setAtom = useCallback((update: SetStateAction<Value>) => {
    if (isWritable(atom)) {
      updateState(() => {
        dispatch({
          type: 'SET_ATOM',
          atom: atom as WritableAtom<unknown, unknown>,
          update,
        });
      });
    } else {
      throw new Error('not writable atom');
    }
  }, [atom, dispatch, updateState]);
  return setAtom;
}
