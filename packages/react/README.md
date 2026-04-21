# @virt-list/react

## 安装

```bash
pnpm add @virt-list/react
```

## 使用实例（最基础）

```tsx
import { VirtList } from '@virt-list/react';

const list = [{ id: 1, text: 'item-1' }];

export default function App() {
  return (
    <div style={{ width: 500, height: 400 }}>
      <VirtList list={list} itemKey='id' itemPreSize={40}>
        {({ itemData }) => <div>{itemData.text}</div>}
      </VirtList>
    </div>
  );
}
```

## Github

https://github.com/kolarorz/virt-list

## Docs

https://kolarorz.github.io/virt-list/
