import React, { useRef, StrictMode } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';

import {
  createAtom,
  deriveAtom,
  useAtom,
  Provider,
} from '../src/index';

describe('derived spec', () => {
  afterEach(cleanup);

  const initialState = {
    count: 0,
    dummy: 0,
  };

  type Action = { type: 'setCount'; value: number };
  const reducer = (state = initialState, action: Action) => {
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
    const globalState = createAtom({
      default: initialState,
    });

    const countState = deriveAtom({
      get: ({ get }) => get(globalState).count,
      set: ({ get, set }, newValue: number) => {
        set(globalState, reducer(get(globalState), { type: 'setCount', value: newValue }));
      },
    });

    const Counter1 = () => {
      const [count1, setCount] = useAtom(countState);
      const increment = () => setCount((c) => (c || 0) + 1);
      const renderCount = useRef(0);
      renderCount.current += 1;
      return (
        <div>
          <span>{count1}</span>
          <button type="button" onClick={increment}>+1</button>
          <span>{renderCount.current}</span>
        </div>
      );
    };
    const App = () => (
      <StrictMode>
        <Provider>
          <Counter1 />
        </Provider>
      </StrictMode>
    );
    const { getAllByText, container } = render(<App />);
    expect(container).toMatchSnapshot();
    fireEvent.click(getAllByText('+1')[0]);
    expect(container).toMatchSnapshot();
  });
});
