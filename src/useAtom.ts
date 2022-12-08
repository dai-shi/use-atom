import type { Atom, WritableAtom } from 'jotai/vanilla';
import { useAtomValue } from './useAtomValue';
import { useSetAtom } from './useSetAtom';

export function useAtom<Value, Args extends unknown[]>(
  atom: WritableAtom<Value, Args, void>,
): [Value, (...args: Args) => void]

export function useAtom<Value>(atom: Atom<Value>): [Value, never]

export function useAtom<Value, Args extends unknown[]>(
  atom: Atom<Value> | WritableAtom<Value, Args, void>,
) {
  return [useAtomValue(atom), useSetAtom(atom as WritableAtom<Value, Args, void>)];
}
