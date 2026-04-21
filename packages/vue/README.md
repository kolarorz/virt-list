# @virt-list/vue

## 安装

```bash
pnpm add @virt-list/vue
```

## 使用实例（最基础）

```vue
<template>
  <div style="width: 500px; height: 400px">
    <VirtList :list="list" itemKey="id" :itemPreSize="40">
      <template #default="{ itemData }">
        <div>{{ itemData.text }}</div>
      </template>
    </VirtList>
  </div>
</template>

<script setup>
import { VirtList } from '@virt-list/vue';

const list = [{ id: 1, text: 'item-1' }];
</script>
```

## Github

https://github.com/kolarorz/virt-list

## Docs

https://kolarorz.github.io/virt-list/
