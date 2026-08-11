# 开始使用

## 安装

::: code-group

```sh [npm]
  $ npm install @virt-list/react
```

```sh [pnpm]
  $ pnpm install @virt-list/react
```

```sh [yarn]
  $ yarn add @virt-list/react
```

:::

## 依赖

- `"react": ">=18.0.0"`
- `"react-dom": ">=18.0.0"`

## 引入样式

滚动条是自绘的，样式必须引一次——不引也能滚，但**看不到滚动条**（滑块的位置与外观全靠
这些类名）。用到 `VirtTree` 时它也提供树的默认外观。放在应用入口即可：

```ts
import '@virt-list/react/style.css';
```

组件的 JS 里刻意不 `import` 这份 css：那会让整个包在纯 Node 环境（SSR）下 import 不了
——Node 不认 `.css` 扩展名。样式只此一份，覆盖 CSS 变量即可换肤，见「滚动是怎么工作的」。

## 注意!!!

1. `list.item.id` <font color="#f00">必须唯一!!!</font>
2. item元素之间不能使用 <font color="#f00">margin!!!</font>

## 引入

```tsx
import { VirtList } from '@virt-list/react';

const list = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  text: `item-${i}`,
}));

function App() {
  return (
    <div style={{ width: 500, height: 400 }}>
      <VirtList list={list} itemKey="id" estimatedSize={20}>
        {({ itemData, index }) => (
          <div>{index} - {itemData.id} - {itemData.text}</div>
        )}
      </VirtList>
    </div>
  );
}

export default App;
```
