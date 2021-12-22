import React, { useEffect, useRef, StrictMode } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';

import { Provider, atom, useAtom } from '../src/index';

describe('derived spec', () => {
  afterEach(cleanup);

  const initialState = {
    count: 0,
    dummy: 0,
  };

  type Action = { type: 'setCount'; value: number } | { type?: undefined };
  const reducer = (state = initialState, action: Action = {}) => {
    switch (action.type) {
      case 'setCount':
        return {
          ...state,
          count: action.value,
        };
      default:
        return state;
    }
  };

  it('counter', () => {
    const globalAtom = atom(initialState);

    const countAtom = atom(
      (get) => get(globalAtom).count,
      (get, set, update: (prev: number) => number) => {
        set(globalAtom, reducer(get(globalAtom), {
          type: 'setCount',
          value: update(get(globalAtom).count),
        }));
      },
    );

    const Counter = () => {
      const [count, setCount] = useAtom(countAtom);
      const increment = () => setCount((c) => c + 1);
      const commitCount = useRef(0);
      useEffect(() => {
        commitCount.current += 1;
      });
      return (
        <div>
          <span>{count}</span>
          <button type="button" onClick={increment}>+1</button>
          <span>{commitCount.current}</span>
        </div>
      );
    };

    const App = () => (
      <StrictMode>
        <Provider>
          <Counter />
        </Provider>
      </StrictMode>
    );

    const { getAllByText, container } = render(<App />);
    expect(container).toMatchSnapshot();
    fireEvent.click(getAllByText('+1')[0]);
    expect(container).toMatchSnapshot();
  });

  it('double counter', () => {
    const countAtom = atom(0);
    const doubledAtom = atom((get) => get(countAtom) * 2);

    const Counter = () => {
      const [count, setCount] = useAtom(countAtom);
      const increment = () => setCount((c) => c + 1);
      return (
        <div>
          <span>count: {count}</span>
          <button type="button" onClick={increment}>+1</button>
        </div>
      );
    };

    const Doubled = () => {
      const [doubled] = useAtom(doubledAtom);
      return <span>doubled: {doubled}</span>;
    };

    const App = () => (
      <StrictMode>
        <Provider>
          <Counter />
          <Doubled />
        </Provider>
      </StrictMode>
    );

    const { getAllByText, container } = render(<App />);
    expect(container).toMatchSnapshot();
    fireEvent.click(getAllByText('+1')[0]);
    expect(container).toMatchSnapshot();
  });
});
