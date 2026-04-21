# @virt-list/vanilla

## 安装

```bash
pnpm add @virt-list/vanilla
```

## 使用实例（最基础）

```html
<div id="list" style="width: 500px; height: 400px"></div>

<script type="module">
  import { VirtList } from '@virt-list/vanilla';

  const list = [{ id: 1, text: 'item-1' }];

  new VirtList({
    list,
    itemKey: 'id',
    itemPreSize: 40,
    container: document.getElementById('list'),
    renderItem: (itemData) => {
      const div = document.createElement('div');
      div.textContent = itemData.text;
      return div;
    },
  });
</script>
```

## Github

https://github.com/kolarorz/virt-list

## Docs

https://kolarorz.github.io/virt-list/
