import React from 'react';

import { useRecoilState } from 'use-atom';

import { counts, total } from './state';

const Item: React.FC<{
  count: (typeof counts)[number];
}> = ({ count }) => {
  const [value, setValue] = useRecoilState(count);
  return (
    <li>
      <span>Count: {value}</span>
      <button type="button" onClick={() => setValue((c) => c + 1)}>+1</button>
      {Math.random()}
    </li>
  );
};

const Total: React.FC = () => {
  const [value] = useRecoilState(total);
  return (
    <div>
      <span>Total: {value}</span>
      <div>{Math.random()}</div>
    </div>
  );
};

const Counter: React.FC = () => (
  <div>
    {Math.random()}
    <ul>
      {counts.map((count) => (
        <Item key={count.key} count={count} />
      ))}
    </ul>
    <Total />
  </div>
);

export default Counter;
