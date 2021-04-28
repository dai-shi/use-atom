import { Dispatch } from 'react';

import { Atom, WritableAtom } from './atom';
import { useAtomValue } from './useAtomValue';
import { useUpdateAtom } from './useUpdateAtom';

export function useAtom<Value, Update>(atom: WritableAtom<Value, Update>): [Value, Dispatch<Update>]

export function useAtom<Value>(atom: Atom<Value>): [Value, never]

export function useAtom<Value, Update>(atom: Atom<Value> | WritableAtom<Value, Update>) {
  return [useAtomValue(atom), useUpdateAtom(atom as WritableAtom<Value, Update>)];
}
