import { atom } from 'use-atom';

export const counts = [
  atom(0),
  atom(0),
  atom(0),
  atom(0),
  atom(0),
];

export const total = atom((get) => counts.reduce((p, c) => p + get(c), 0));
