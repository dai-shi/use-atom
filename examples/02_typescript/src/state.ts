import { atom, selector } from 'use-atom';

export const counts = [
  atom({ key: 'count1', default: 0 }),
  atom({ key: 'count2', default: 0 }),
  atom({ key: 'count3', default: 0 }),
  atom({ key: 'count4', default: 0 }),
  atom({ key: 'count5', default: 0 }),
];

export const total = selector({
  key: 'total',
  get: ({ get }) => counts.reduce((p, c) => p + get(c), 0),
});
