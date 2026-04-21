# 开始使用

## 安装

::: code-group

```sh [npm]
  $ npm install @virt-list/vue
```

```sh [pnpm]
  $ pnpm install @virt-list/vue
```

```sh [yarn]
  $ yarn add @virt-list/vue
```

:::

## 依赖

- `"vue": ">=3"`

## 注意!!!

1. `list.item.id` <font color="#f00">必须唯一!!!</font>
2. item元素之间不能使用 <font color="#f00">margin!!!</font>

## 引入

```html
<template>
  <div style="width: 500px; height: 400px">
    <VirtList itemKey="id" :list="list" :itemPreSize="20">
      <template #default="{ itemData, index }">
        <div>{{ index }} - {{ itemData.id }} - {{ itemData.text }}</div>
      </template>
    </VirtList>
  </div>
</template>

<script setup>
  import { VirtList } from '@virt-list/vue';
  const list = [{ id: 0, text: 'text' }];
</script>
```
