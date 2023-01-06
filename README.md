# use-atom

[![CI](https://img.shields.io/github/actions/workflow/status/dai-shi/use-atom/ci.yml?branch=main)](https://github.com/dai-shi/use-atom/actions?query=workflow%3ACI)
[![npm](https://img.shields.io/npm/v/use-atom)](https://www.npmjs.com/package/use-atom)
[![size](https://img.shields.io/bundlephobia/minzip/use-atom)](https://bundlephobia.com/result?p=use-atom)
[![discord](https://img.shields.io/discord/627656437971288081)](https://discord.gg/MrQdmzd)

Yet another implementation for Jotai atoms without side effects

## Introduction

This library used to be a former library to [jotai](https://github.com/pmndrs/jotai).
It's now rewritten to follow jotai API and depends on
[use-context-selector](https://github.com/dai-shi/use-context-selector).
The biggest difference is that side effects in `write` is not allowed.

## Install

```bash
npm install use-atom jotai
```

## Usage

```javascript
import React from 'react';
import ReactDOM from 'react-dom';

import { Provider, atom, useAtom } from 'use-atom';

const countAtom = atom(0);
const textAtom = atom('hello');

const Counter = () => {
  const [count, setCount] = useAtom(countAtom);
  return (
    <div>
      {Math.random()}
      <div>
        <span>Count: {count}</span>
        <button type="button" onClick={() => setCount(count + 1)}>+1</button>
        <button type="button" onClick={() => setCount((c) => c - 1)}>-1</button>
      </div>
    </div>
  );
};

const TextBox = () => {
  const [text, setText] = useAtom(textAtom);
  return (
    <div>
      {Math.random()}
      <div>
        <span>Text: {text}</span>
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </div>
    </div>
  );
};

const App = () => (
  <Provider>
    <h1>Counter</h1>
    <Counter />
    <Counter />
    <h1>TextBox</h1>
    <TextBox />
    <TextBox />
  </Provider>
);
```

## Examples

The [examples](examples) folder contains working examples.
You can run one of them with

```bash
PORT=8080 npm run examples:01_minimal
```

and open <http://localhost:8080> in your web browser.

You can also try them in codesandbox.io:
[01](https://codesandbox.io/s/github/dai-shi/use-atom/tree/main/examples/01_minimal)
[02](https://codesandbox.io/s/github/dai-shi/use-atom/tree/main/examples/02_typescript)
