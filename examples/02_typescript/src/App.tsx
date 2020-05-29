import React from 'react';

import { RecoilRoot } from 'use-atom';

import Counter from './Counter';

const App: React.FC = () => (
  <RecoilRoot>
    <h1>Counter</h1>
    <Counter />
    <hr />
    <Counter />
  </RecoilRoot>
);

export default App;
