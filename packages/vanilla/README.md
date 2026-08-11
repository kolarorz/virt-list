# @virt-list/vanilla

[![npm](https://img.shields.io/npm/v/@virt-list/vanilla.svg?sanitize=true)](https://www.npmjs.com/package/@virt-list/vanilla)

原生 DOM 的虚拟**列表 / 网格 / 树形**，无框架依赖。也是 virt-list 各框架包底下的同一层实现——
`@virt-list/vue`、`@virt-list/react` 等只是在它外面套了一层薄薄的绑定。

不定高无需声明高度，三十万行与三十行的 DOM 节点数相同。

## 安装

```sh
pnpm add @virt-list/vanilla
```

## 引入样式

滚动条是自绘的，样式必须引一次——不引也能滚，但**看不到滚动条**（滑块的位置与外观全靠
这些类名）。一份 `style.css` 同时包含滚动条与树：

```ts
import '@virt-list/vanilla/style.css';
```

只要其中一半的话，两份原始样式也单独导出着：

```ts
import '@virt-list/vanilla/scrollbar.css';      // 只要滚动条
import '@virt-list/vanilla/src/tree/tree.css';  // 只要树
```

可定制项都以 CSS 变量暴露（`--virt-scrollbar-*` / `--virt-tree-*`），覆盖变量即可换肤；
暗色模式跟随宿主的 `html.dark` 或任意祖先上的 `[data-theme='dark']`。

## 最小示例

```html
<!-- 容器必须有确定的尺寸，组件不会自己撑开 -->
<div id="list" style="width: 500px; height: 400px"></div>

<script type="module">
  import { VirtList } from '@virt-list/vanilla';
  import '@virt-list/vanilla/style.css';

  const list = Array.from({ length: 100000 }, (_, i) => ({ id: i, text: `item-${i}` }));

  // 容器是第一个参数，不是 options 里的字段
  const vl = new VirtList(
    document.getElementById('list'),
    {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      // 返回元素会被挂进项的容器；也可以直接改传入的 el，少一层 DOM 嵌套
      renderItem: (item, index, el) => {
        el.textContent = item.text;
      },
    },
    {
      update: (renderList, state) => {
        console.log(`可视区间 ${state.inViewBegin} - ${state.inViewEnd}`);
      },
    },
  );

  vl.scrollToIndex(50000);

  // 数据换了之后
  // vl.setList(next); vl.forceUpdate();

  // 容器销毁前
  // vl.destroy();
</script>
```

`new VirtList(container, options, events?)`——三个参数分别是容器元素、配置、事件回调。
`VirtGrid` 与 `VirtTree` 的签名相同。

## 导出

| 导出 | 说明 |
| --- | --- |
| `VirtList` | 虚拟列表，支持不定高、水平滚动、sticky 区域、空状态、无限加载 |
| `VirtGrid` | 虚拟网格，`gridItems` 指定每行列数，按行虚拟化 |
| `VirtTree` | 虚拟树，展开 / 选择 / 勾选 / 过滤 / 拖拽排序 |
| `DEFAULT_DOM_OPTIONS` | DOM 层配置项的默认值 |
| `Scrollbar` / `InputController` | 自绘滚动条的可复用零件（画滑块、接管滚轮键盘触摸），供别的虚拟化组件共用同一套外观与手势 |
| `computeThumb` / `positionToRatio` / `ratioToPosition` / `pointerToRatio` | 滑块几何的纯函数，前后互逆，保证「拖到某处松手滑块不跳」 |
| `createStreamBuffer` | 流式输出的帧内合并（从 core 转出，免得你为它多依赖一个包） |
| `normalizeStyle` / `mergeStyles` / `setAttrs` / `applyStyle` / `applyClass` | style / class / attrs 的归一化工具 |
| 类型 | `VirtGridOptions` / `TreeNode` / `TreeFieldNames` / `VirtScrollEvent` / `ListState` / `LoadState` 等 |

## 常用 API

```ts
// 滚动
scrollToIndex(index, opts?) / scrollIntoView(index, opts?)
scrollToTop(opts?) / scrollToBottom(opts?) / scrollToOffset(offset, opts?) / cancelScroll()
// opts: { behavior: 'auto' | 'smooth', align: 'start' | 'end', focus, duration, onDone }

// 状态与几何
state                       // getter，等价于 core.getState()
getOffset() / getMaxOffset() / getTotalSize() / getIndexByOffset(offset) / getLoadState()

// 数据与生命周期
setList(list) / forceUpdate() / refreshItems(keys?) / updateOptions(partial)
reset() / resume() / destroy()

// 元素（只认 DOM 元素的场合，比如把别的组件定位到视口上）
clientEl / listEl / itemsEl / core
```

更细的几何计算走 `core`：`core.getItemSize(key)` / `core.getItemPosByIndex(index)`。

事件：`scroll`（载荷是 `VirtScrollEvent`，带 `source` 区分用户 / 程序 / 内部补偿）、
`offsetChange`、`toTop`、`toBottom`、`itemResize`、`update`、`loadStateChange`。

## 用之前需要知道的

- **`estimatedSize` 必填**：首屏布局与未测量项的占位依据，不定高时越接近实测值抖动越少。
- **容器要有确定尺寸**（水平模式下是宽度），且这个库不需要你给项声明高度。
- **偏移量归 JS 掌管**：容器是 `overflow: hidden`，`scrollTop` 恒为 0。读写滚动位置用
  `getOffset()` / `scrollToOffset()`；感知滚动用 `scroll` 事件而不是原生 `scroll`。
- **键盘默认接管**（方向键 / PageUp-Down / Space / Home-End）。宿主已在祖先元素上处理这些键时，
  用 `keyboard: false` 关掉，否则一次按键会既滚一段又走一格。
- **需要原生滚动条**的项目请用旧库 [vue-virt-list](https://github.com/kolarorz/vue-virt-list)，
  这里没有原生滚动这条路。
- **无障碍**：`aria: true`（或 `'listbox'`）会补上 `role` 与 `aria-posinset` / `aria-setsize`
  ——虚拟滚动下 DOM 里只有几十项，不显式告知总数的话屏幕阅读器会读成「第 3 项，共 20 项」。
  默认关闭，因为加 role 会改变既有 DOM 的语义。

## 文档

- 文档站：<https://kolarorz.github.io/virt-list/>（顶部导航切到 Vanilla 看示例与 API）
- GitHub：<https://github.com/kolarorz/virt-list>

## 许可

MIT
