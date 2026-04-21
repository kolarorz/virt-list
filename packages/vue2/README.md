# @virt-list/vue2

## 安装

```bash
pnpm add @virt-list/vue2
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

<script>
import { VirtList } from '@virt-list/vue2';

export default {
  components: { VirtList },
  data() {
    return {
      list: [{ id: 1, text: 'item-1' }],
    };
  },
};
</script>
```

## Github

https://github.com/kolarorz/virt-list

## Docs

https://kolarorz.github.io/virt-list/
