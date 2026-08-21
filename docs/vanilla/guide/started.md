# 开始使用

## 安装

::: code-group

```sh [npm]
  $ npm install @virt-list/vanilla
```

```sh [pnpm]
  $ pnpm install @virt-list/vanilla
```

```sh [yarn]
  $ yarn add @virt-list/vanilla
```

:::

## 引入样式

滚动条是自绘的，样式必须引一次——不引也能滚，但**看不到滚动条**（滑块的位置与外观全靠
这些类名）。用到 `VirtTree` 时它也提供树的默认外观。放在应用入口即可：

```ts
import '@virt-list/vanilla/style.css';
```

组件的 JS 里刻意不 `import` 这份 css：那会让整个包在纯 Node 环境（SSR）下 import 不了
——Node 不认 `.css` 扩展名。样式只此一份，覆盖 CSS 变量即可换肤，见「滚动是怎么工作的」。

::: warning 两条硬约束
- `itemKey` 指向的字段在整个列表里必须唯一，重复的 key 会让滚动错位。
- 列表项之间不能用 `margin`：外边距不计入项的测量尺寸，用 `itemGap` 或 `padding` 代替。
:::

## 引入

```html
<div id="list" style="width: 500px; height: 400px"></div>

<script type="module">
  import { VirtList } from '@virt-list/vanilla';

  const list = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    text: `item-${i}`,
  }));

  const virtList = new VirtList({
    list,
    itemKey: 'id',
    estimatedSize: 20,
    container: document.getElementById('list'),
    renderItem: (itemData, index) => {
      const div = document.createElement('div');
      div.textContent = `${index} - ${itemData.id} - ${itemData.text}`;
      return div;
    },
  });
</script>
```
