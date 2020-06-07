import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
} from 'react';
import { useContext, useContextSelector } from 'use-context-selector';

import { StateContext, DispatchContext, AtomState } from './Provider';
import { Atom, WritableAtom } from './createAtom';

const isWritable = (
  atom: Atom<unknown> | WritableAtom<unknown>,
): atom is WritableAtom<unknown> => !!(atom as WritableAtom<unknown>).set;

export function useAtom<Value>(atom: WritableAtom<Value>): [Value, Dispatch<SetStateAction<Value>>]
export function useAtom<Value>(atom: Atom<Value>): [Value, never]

export function useAtom<Value>(atom: Atom<Value> | WritableAtom<Value>) {
  const dispatch = useContext(DispatchContext);
  const atomState = useContextSelector(StateContext, useCallback((state) => (
    state.get(atom) as AtomState<Value> | undefined
  ), [atom]));
  const setAtom = useCallback((update: SetStateAction<Value>) => {
    if (isWritable(atom)) {
      dispatch({ type: 'UPDATE_VALUE', atom, update });
    } else {
      throw new Error('not writable atom');
    }
  }, [atom, dispatch]);
  useEffect(() => {
    dispatch({ type: 'INIT_ATOM', atom });
    return () => {
      dispatch({ type: 'DISPOSE_ATOM', atom });
    };
  }, [dispatch, atom]);
  if (atomState && atomState.promise) {
    throw atomState.promise;
  }
  return [
    atomState === undefined ? atom.default : atomState.value,
    setAtom,
  ];
}
