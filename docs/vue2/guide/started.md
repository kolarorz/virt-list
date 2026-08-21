# 开始使用

## 安装

::: code-group

```sh [npm]
  $ npm install @virt-list/vue2
```

```sh [pnpm]
  $ pnpm install @virt-list/vue2
```

```sh [yarn]
  $ yarn add @virt-list/vue2
```

:::

## 依赖

- `"vue": "^2.6.0 || ^2.7.0"`

## vue版本说明

`<=vue2.6` 需要自行安装 @vue/composition-api
`>=vue2.7` 自带 composition-api，则无需处理

## 引入样式

滚动条是自绘的，样式必须引一次——不引也能滚，但**看不到滚动条**（滑块的位置与外观全靠
这些类名）。用到 `VirtTree` 时它也提供树的默认外观。放在应用入口即可：

```ts
import '@virt-list/vue2/style.css';
```

组件的 JS 里刻意不 `import` 这份 css：那会让整个包在纯 Node 环境（SSR）下 import 不了
——Node 不认 `.css` 扩展名。样式只此一份，覆盖 CSS 变量即可换肤，见「滚动是怎么工作的」。

::: warning 两条硬约束
- `itemKey` 指向的字段在整个列表里必须唯一，重复的 key 会让滚动错位。
- 列表项之间不能用 `margin`：外边距不计入项的测量尺寸，用 `itemGap` 或 `padding` 代替。
:::

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

<script>
  import { VirtList } from '@virt-list/vue2';
  export default {
    components: { VirtList },
    data() {
      return {
        list: [{ id: 0, text: 'text' }],
      };
    },
  };
</script>
```
