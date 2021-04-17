import { SetStateAction, useCallback } from 'react';
import { useContext } from 'use-context-selector';
import { DispatchContext } from './Provider';
import { Atom, WritableAtom } from './atom';

const isWritable = (
  atom: Atom<unknown> | WritableAtom<unknown>,
): atom is WritableAtom<unknown> => !!(atom as WritableAtom<unknown>).write;

export function useUpdateAtom<Value>(atom: WritableAtom<Value>) {
  const dispatch = useContext(DispatchContext);
  const setAtom = useCallback((update: SetStateAction<Value>) => {
    if (isWritable(atom)) {
      dispatch({
        type: 'UPDATE_VALUE',
        atom: atom as WritableAtom<unknown>,
        update,
      });
    } else {
      throw new Error('not writable atom');
    }
  }, [atom, dispatch]);
  return setAtom;
}
