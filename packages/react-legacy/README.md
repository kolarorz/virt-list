# @virt-list/react-legacy

## 安装

```bash
pnpm add @virt-list/react-legacy
```

## 使用实例（最基础）

```tsx
import { VirtList } from '@virt-list/react-legacy';

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
