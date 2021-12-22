import React from 'react';
import ReactDOM from 'react-dom';

import { Provider, atom, useAtom } from 'use-atom';

const countAtom = atom(0);
const textAtom = atom('hello');

const Counter = () => {
  const [count, setCount] = useAtom(countAtom);
  return (
    <div>
      {Math.random()}
      <div>
        <span>Count: {count}</span>
        <button type="button" onClick={() => setCount(count + 1)}>+1</button>
        <button type="button" onClick={() => setCount((c) => c - 1)}>-1</button>
      </div>
    </div>
  );
};

const TextBox = () => {
  const [text, setText] = useAtom(textAtom);
  return (
    <div>
      {Math.random()}
      <div>
        <span>Text: {text}</span>
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </div>
    </div>
  );
};

const App = () => (
  <Provider>
    <h1>Counter</h1>
    <Counter />
    <Counter />
    <h1>TextBox</h1>
    <TextBox />
    <TextBox />
  </Provider>
);

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
