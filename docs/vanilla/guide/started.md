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

## 注意!!!

1. `list.item.id` <font color="#f00">必须唯一!!!</font>
2. item元素之间不能使用 <font color="#f00">margin!!!</font>

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
    itemPreSize: 20,
    container: document.getElementById('list'),
    renderItem: (itemData, index) => {
      const div = document.createElement('div');
      div.textContent = `${index} - ${itemData.id} - ${itemData.text}`;
      return div;
    },
  });
</script>
```
