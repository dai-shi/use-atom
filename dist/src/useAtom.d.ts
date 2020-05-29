import { Dispatch, SetStateAction } from 'react';
import { Atom, WritableAtom } from './createAtom';
export declare function useAtom<Value>(atom: WritableAtom<Value>): [Value, Dispatch<SetStateAction<Value>>];
export declare function useAtom<Value>(atom: Atom<Value>): [Value, never];
