import { Dispatch, SetStateAction } from 'react';

import { Atom, WritableAtom } from './atom';
import { useAtomValue } from './useAtomValue';
import { useUpdateAtom } from './useUpdateAtom';

export function useAtom<Value>(atom: WritableAtom<Value>): [Value, Dispatch<SetStateAction<Value>>]

export function useAtom<Value>(atom: Atom<Value>): [Value, never]

export function useAtom<Value>(atom: Atom<Value> | WritableAtom<Value>) {
  return [useAtomValue(atom), useUpdateAtom(atom as WritableAtom<Value>)];
}
