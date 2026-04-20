# 开始使用

## 安装

::: code-group

```sh [npm]
  $ npm install @virt-list/react-legacy
```

```sh [pnpm]
  $ pnpm install @virt-list/react-legacy
```

```sh [yarn]
  $ yarn add @virt-list/react-legacy
```

:::

## 依赖

- `"react": ">=16.8.0"`
- `"react-dom": ">=16.8.0"`

## 注意!!!

1. `list.item.id` <font color="#f00">必须唯一!!!</font>
2. item元素之间不能使用 <font color="#f00">margin!!!</font>

## 引入

```tsx
import { VirtList } from '@virt-list/react-legacy';

const list = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  text: `item-${i}`,
}));

function App() {
  return (
    <div style={{ width: 500, height: 400 }}>
      <VirtList list={list} itemKey="id" itemPreSize={20}>
        {({ itemData, index }) => (
          <div>{index} - {itemData.id} - {itemData.text}</div>
        )}
      </VirtList>
    </div>
  );
}

export default App;
```
