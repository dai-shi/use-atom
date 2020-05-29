import { createAtom, deriveAtom, useAtom } from '../src/index';

describe('basic spec', () => {
  it('exported function', () => {
    expect(createAtom).toBeDefined();
    expect(deriveAtom).toBeDefined();
    expect(useAtom).toBeDefined();
  });
});
