import { createAtom, WritableAtom } from '../createAtom';

export function atom<Value>(
  options: { key: string; default: Value },
) {
  return createAtom(options) as WritableAtom<Value> & { key: string };
}
