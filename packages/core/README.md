# @virt-list/core

## 安装

```bash
pnpm add @virt-list/core
```

## 使用实例（最基础）

```ts
import { VirtListCore } from '@virt-list/core';

const list = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  text: `item-${i}`,
}));

const core = new VirtListCore(
  {
    list,
    itemKey: 'id',
    itemPreSize: 40,
  },
  {
    update(renderList) {
      console.log(renderList);
    },
  },
);
```

## Github

https://github.com/kolarorz/virt-list

## Docs

https://kolarorz.github.io/virt-list/
