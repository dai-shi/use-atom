import React from 'react';

import { Provider } from 'use-atom';

import Counter from './Counter';

const App: React.FC = () => (
  <Provider>
    <h1>Counter</h1>
    <Counter />
    <hr />
    <Counter />
  </Provider>
);

export default App;
