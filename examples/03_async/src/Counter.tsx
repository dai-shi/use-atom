// eslint-disable-next-line spaced-comment
/// <reference types="react/next" />

import React, { useTransition } from 'react';

import { useAtom, useSetAtom } from 'use-atom';

import { counts, delayedTotal, delayedUpdate1 } from './state';

const Item: React.FC<{
  count: (typeof counts)[number];
}> = ({ count }) => {
  const [value, setValue] = useAtom(count);
  const [isPending, startTransiton] = useTransition();
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
  const [value] = useAtom(delayedTotal);
  return (
    <div>
      <span>Total (delayed): {value}</span>
      <div>{Math.random()}</div>
    </div>
  );
};

const Update1: React.FC = () => {
  const setValue = useSetAtom(delayedUpdate1);
  const [isPending, startTransiton] = useTransition();
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
        <Item count={count} />
      ))}
    </ul>
    <Total />
  </div>
);

export default Counter;
