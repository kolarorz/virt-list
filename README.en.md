# virt-list — Virtual Lists, Trees and Streaming Chat for React, Vue and Vanilla JavaScript

English · [简体中文](./README.md)

Virtual lists, trees and grids for React, Vue and vanilla JavaScript, with dynamic item heights and streaming chat support.

**[Live demos](https://kolarorz.github.io/virt-list/)** · [Vanilla JS streaming chat](https://kolarorz.github.io/virt-list/vanilla/ai/streaming) · [React streaming chat](https://kolarorz.github.io/virt-list/react/ai/streaming) · [Vue streaming chat](https://kolarorz.github.io/virt-list/vue/ai/streaming) · [Architecture](./ARCHITECTURE.md)

The documentation site is currently in Chinese; this page covers installation and project selection in English.

## When to use it

- **Streaming chat:** follow growing messages, pause following while reading history, and load history in both directions.
- **Dynamic-height lists:** render a window of messages, logs or cards without declaring every item's height in advance.
- **Trees and grids:** share the same TypeScript virtualization engine across framework bindings.

Scrolling uses **JavaScript-managed offsets and custom scrollbars**. If your Vue application needs native browser scrolling, evaluate [vue-virt-list](https://github.com/kolarorz/vue-virt-list). If you need a complete data grid with merged cells, pinned columns, filtering and editing, see [virt-table](https://github.com/kolarorz/virt-table).

## Install

Install the package matching your framework, then import its stylesheet.

| Package | Target |
| --- | --- |
| `@virt-list/react` | React 18+ |
| `@virt-list/react-legacy` | React 16.8–17 |
| `@virt-list/vue` | Vue 3 |
| `@virt-list/vue2` | Vue 2.6 / 2.7; Vue 2.6 also needs `@vue/composition-api` |
| `@virt-list/vanilla` | Vanilla JavaScript |
| `@virt-list/core` | Framework-independent algorithm layer, without DOM rendering |

```sh
npm install @virt-list/react
```

## React quick start

```tsx
import { VirtList } from '@virt-list/react';
import '@virt-list/react/style.css';

const list = Array.from({ length: 100000 }, (_, id) => ({
  id,
  text: `Item ${id}`,
}));

export default function App() {
  return (
    <div style={{ width: 500, height: 400 }}>
      <VirtList list={list} itemKey="id" estimatedSize={40}>
        {({ itemData }) => <div>{itemData.text}</div>}
      </VirtList>
    </div>
  );
}
```

Give the container an explicit height. `estimatedSize` is an initial estimate; item sizes are measured as content changes.

See [Vue 3 setup](https://kolarorz.github.io/virt-list/vue/guide/started), [Vue 2 setup](https://kolarorz.github.io/virt-list/vue2/guide/started), [vanilla JavaScript setup](https://kolarorz.github.io/virt-list/vanilla/guide/started) and the [scrolling model](https://kolarorz.github.io/virt-list/vanilla/guide/custom-scrollbar).

## Project background

This project evolved from [vue-virt-list](https://github.com/kolarorz/vue-virt-list), separating its algorithms from Vue reactivity into a shared core, DOM implementation and framework bindings. The newer package is not a drop-in migration: review APIs, styles and browser scrolling requirements before replacing an existing list.

## Development

```sh
pnpm install
pnpm dev
pnpm test
```

[Changelog](./CHANGELOG.md) · [Publishing](./PUBLISHING.md) · [Report an issue](https://github.com/kolarorz/virt-list/issues)

If the project helps you, a GitHub star helps others discover it. Bug reports and reproducible examples are welcome.

## License

[MIT](./LICENSE)
