import { SetStateAction, useCallback } from 'react';
import { useContext } from 'use-context-selector';
import { DispatchContext } from './Provider';
import { Atom, WritableAtom } from './atom';

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>,
): atom is WritableAtom<Value, Update> => !!(atom as WritableAtom<Value, Update>).write;

export function useUpdateAtom<Value, Update>(atom: WritableAtom<Value, Update>) {
  const dispatch = useContext(DispatchContext);
  const setAtom = useCallback((update: SetStateAction<Value>) => {
    if (isWritable(atom)) {
      dispatch({
        type: 'UPDATE_VALUE',
        atom: atom as WritableAtom<Value, Update>,
        update,
      });
    } else {
      throw new Error('not writable atom');
    }
  }, [atom, dispatch]);
  return setAtom;
}
