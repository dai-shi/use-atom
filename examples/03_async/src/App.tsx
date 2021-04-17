import React, { Suspense } from 'react';

import { Provider } from 'use-atom';

import Counter from './Counter';

const App: React.FC = () => (
  <Provider>
    <Suspense fallback="Loading...">
      <h1>Counter</h1>
      <Counter />
      <hr />
      <Counter />
    </Suspense>
  </Provider>
);

export default App;
