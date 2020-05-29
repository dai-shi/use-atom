import React, { Suspense } from 'react';

import { RecoilRoot } from 'use-atom';

import Counter from './Counter';

const App: React.FC = () => (
  <RecoilRoot>
    <Suspense fallback="Loading...">
      <h1>Counter</h1>
      <Counter />
      <hr />
      <Counter />
    </Suspense>
  </RecoilRoot>
);

export default App;
