// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { unstable_useTransition as useTransition } from 'react';

import { useRecoilState, useSetRecoilState } from 'use-atom';

import { counts, delayedTotal, delayedUpdate1 } from './state';

const Item: React.FC<{
  count: (typeof counts)[number];
}> = ({ count }) => {
  const [value, setValue] = useRecoilState(count);
  const [startTransiton, isPending] = useTransition({ timeoutMs: 2000 });
  const increment = () => {
    startTransiton(() => {
      setValue((c) => c + 1);
    });
  };
  return (
    <li>
      <span>Count: {value}</span>
      <button type="button" onClick={increment}>+1</button>
      {Math.random()}
      {isPending && 'Pending...'}
    </li>
  );
};

const Total: React.FC = () => {
  const [value] = useRecoilState(delayedTotal);
  return (
    <div>
      <span>Total (delayed): {value}</span>
      <div>{Math.random()}</div>
    </div>
  );
};

const Update1: React.FC = () => {
  const setValue = useSetRecoilState(delayedUpdate1);
  const [startTransiton, isPending] = useTransition({ timeoutMs: 2000 });
  const decrement = () => {
    startTransiton(() => {
      setValue((c) => (c || 0) - 1);
    });
  };
  return (
    <div>
      <button type="button" onClick={decrement}>-1</button>
      {Math.random()}
      {isPending && 'Pending...'}
    </div>
  );
};

const Counter: React.FC = () => (
  <div>
    {Math.random()}
    <Update1 />
    <ul>
      {counts.map((count) => (
        <Item key={count.key} count={count} />
      ))}
    </ul>
    <Total />
  </div>
);

export default Counter;
