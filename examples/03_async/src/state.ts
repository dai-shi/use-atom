import { atom } from 'use-atom';

export const counts = [
  atom(0),
  atom(0),
  atom(0),
  atom(0),
  atom(0),
];

const sleep = (ms: number) => new Promise((r) => {
  setTimeout(r, ms);
});

export const delayedTotal = atom(async (get) => {
  await sleep(1000);
  return counts.reduce((p, c) => p + get(c), 0);
});

export const delayedUpdate1 = atom(
  (get) => get(counts[0]),
  async (_get, set, newValue: number) => {
    await sleep(1000);
    set(counts[0], newValue);
  },
);
