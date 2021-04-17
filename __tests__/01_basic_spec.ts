import { Provider, atom, useAtom } from '../src/index';

describe('basic spec', () => {
  it('exported function', () => {
    expect(Provider).toBeDefined();
    expect(atom).toBeDefined();
    expect(useAtom).toBeDefined();
  });
});
