import {
  Provider,
  atom,
  useAtom,
  useAtomValue,
  useSetAtom,
} from '../src/index';

describe('basic spec', () => {
  it('exported function', () => {
    expect(Provider).toBeDefined();
    expect(atom).toBeDefined();
    expect(useAtom).toBeDefined();
    expect(useAtomValue).toBeDefined();
    expect(useSetAtom).toBeDefined();
  });
});
