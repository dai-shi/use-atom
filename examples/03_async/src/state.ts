import { atom, selector } from 'use-atom';

export const counts = [
  atom({ key: 'count1', default: 0 }),
  atom({ key: 'count2', default: 0 }),
  atom({ key: 'count3', default: 0 }),
  atom({ key: 'count4', default: 0 }),
  atom({ key: 'count5', default: 0 }),
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const delayedTotal = selector({
  key: 'total',
  get: async ({ get }) => {
    await sleep(1000);
    return counts.reduce((p, c) => p + get(c), 0);
  },
});

export const delayedUpdate1 = selector({
  key: 'decrement1',
  get: ({ get }) => get(counts[0]),
  set: async ({ set }, newValue: number) => {
    await sleep(1000);
    set(counts[0], newValue);
  },
});
