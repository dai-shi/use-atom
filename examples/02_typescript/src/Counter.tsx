import React from 'react';

import { useAtom } from 'use-atom';

import { counts, total } from './state';

const Item = ({ count }: {
  count: (typeof counts)[number];
}) => {
  const [value, setValue] = useAtom(count);
  return (
    <li>
      <span>Count: {value}</span>
      <button type="button" onClick={() => setValue((c) => c + 1)}>+1</button>
      {Math.random()}
    </li>
  );
};

const Total = () => {
  const [value] = useAtom(total);
  return (
    <div>
      <span>Total: {value}</span>
      <div>{Math.random()}</div>
    </div>
  );
};

const Counter = () => (
  <div>
    {Math.random()}
    <ul>
      {counts.map((count) => (
        <Item count={count} />
      ))}
    </ul>
    <Total />
  </div>
);

export default Counter;
