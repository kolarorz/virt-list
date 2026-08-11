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

## 引入样式

滚动条是自绘的，样式必须引一次——不引也能滚，但**看不到滚动条**（滑块的位置与外观全靠
这些类名）。用到 `VirtTree` 时它也提供树的默认外观。放在应用入口即可：

```ts
import '@virt-list/vue/style.css';
```

组件的 JS 里刻意不 `import` 这份 css：那会让整个包在纯 Node 环境（SSR）下 import 不了
——Node 不认 `.css` 扩展名。样式只此一份，覆盖 CSS 变量即可换肤，见「滚动是怎么工作的」。

## 注意!!!

1. `list.item.id` <font color="#f00">必须唯一!!!</font>
2. item元素之间不能使用 <font color="#f00">margin!!!</font>

## 引入

```html
<template>
  <div style="width: 500px; height: 400px">
    <VirtList itemKey="id" :list="list" :estimatedSize="20">
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
