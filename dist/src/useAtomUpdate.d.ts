import { SetStateAction } from 'react';
import { WritableAtom } from './createAtom';
export declare function useAtomUpdate<Value>(atom: WritableAtom<Value>): (update: SetStateAction<Value>) => void;
