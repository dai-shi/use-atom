import { useCallback } from 'react';
import { useContext, useContextUpdate } from 'use-context-selector';
import type { Atom, WritableAtom } from 'jotai/vanilla';
import { StateContext, DispatchContext } from './Provider';

const isWritable = <Value, Args extends unknown[]>(
  atom: Atom<Value> | WritableAtom<Value, Args, void>,
): atom is WritableAtom<Value, Args, void> => !!(atom as WritableAtom<Value, Args, void>).write;

export function useSetAtom<Value, Args extends unknown[]>(
  atom: WritableAtom<Value, Args, void>,
) {
  const dispatch = useContext(DispatchContext);
  const updateState = useContextUpdate(StateContext);
  const setAtom = useCallback((...args: Args) => {
    if (isWritable(atom)) {
      updateState(() => {
        dispatch({
          type: 'SET_ATOM',
          atom: atom as WritableAtom<unknown, unknown[], void>,
          args,
        });
      });
    } else {
      throw new Error('not writable atom');
    }
  }, [atom, dispatch, updateState]);
  return setAtom;
}
