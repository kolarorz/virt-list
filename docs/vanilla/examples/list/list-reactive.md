# 响应式更新

**先说结论：纯 DOM 用法下没有任何响应式——大数据量下推荐的就是这种形态。**
框架包那边的建议也是把列表从深响应式里拿出来（Vue 用 `shallowRef`、React 用 `useRef`），
因为虚拟列表只渲染可视区那几十行，让框架去追踪全量数据，代价按 n 收、收益只有那几十行。
vanilla 天生就在这一档，你要付的只是「改完自己说一声」。

「说一声」有两种精细度，先说图省事的那种。下面按「图省事怎么写」→「大数据量怎么写」的顺序展开。

## 图省事：改完调 forceUpdate()

数据量小、又不想操心「到底改了哪几项」时，最少的写法是：**连 `updateItem` 都不给，
改完无脑 `forceUpdate()`**。

```js
const virtList = new VirtList(container, {
  list,
  itemKey: 'id',
  renderItem: (item, index, el) => paint(item, el),
});

// 怎么改都行，改完一句收尾
list[3].name = 'new';
virtList.forceUpdate();
```

代价写在名字里：它清空渲染池，**可视区每一项的 DOM 都被拆掉重建**（重新走 `renderItem`、
重新插入子节点、浏览器重新布局）。几百条的列表、低频更新，这笔开销无所谓；
一秒刷好几次的长列表就能看出抖动了。

::: warning 别指望「改完什么都不做」
库持有的就是你传进来的那个数组对象，原地改动到的就是它。所以只要随后恰好发生一次滚动或
尺寸变化，新数据就会冒出来——但没有那次触发时它不会。这种时好时坏比彻底不工作更难查，
所以改完请明确走下面三条通道之一。
:::

## 数据量大：setList + updateItem，或点名 refreshItems

想让开销配得上改动量，就把两件事说清楚：**数据换了什么**，以及**怎么把一项的内容原地更新**。

```js
const virtList = new VirtList(container, {
  list,
  itemKey: 'id',
  renderItem: (item, index, el) => paint(item, el),
  updateItem: (item, index, el) => paint(item, el),  // 常常就是同一个函数
});

// 增删改：换成新数组再 setList，DOM 全部复用，只有内容被原地改写
list = list.map((it) => (it.id === id ? { ...it, name } : it));
virtList.setList(list);

// 只改了某几项的字段、又不想走 setList：点名刷那几项
list[3].name = 'new';
virtList.refreshItems([list[3].id]);
```

`updateItem` 是这一档的关键：渲染池里已有的 key 不会重新调用 `renderItem`（这是增量 patch 的核心优化），
所以 `setList` 之后同一个 key 的项默认会停在挂载那一刻。给出 `updateItem`，
数据变更就会带着最新的 item 回调它——滚动与尺寸上报**不会**触发它，不必担心影响滚动性能。

之所以要分成两个回调而不是重跑 `renderItem`：后者的返回值会被 `appendChild`，
复用时再调一次会重复追加子节点。`updateItem` 返回 `void`，语义就是「原地更新」。

## 示例在演示什么

示例走的是大数据量那一档（给了 `updateItem`），切换「更新方式」即可对比：

- **换新数组**（推荐）：换成新数组后 `setList(list)`。组件通过 `updateItem` 把最新数据
  交给可视区内的每一项，行上的轮次跟着涨。
- **原地修改**：直接改字段、也不调 `setList`。组件完全不知道数据动过，行上的轮次会停住，
  点 `refreshItems()` 才追上。

## 它是怎么知道数据变了的

它不知道——**纯 DOM 用法下没有任何侦测机制**，是你调 `setList` 告诉它的。

框架包（vue / react 等）里这一步由框架代劳：内部一个 `watch`（React 侧是 layout effect 里的一次比较）
只比较数组引用与长度，变了就替你调 `setList`。vanilla 没有那一层，所以这是唯一的入口。

## 三种更新手段的分工

| 手段 | 什么时候用 | 范围与代价 |
|---|---|---|
| `setList()` + `updateItem` | 数据换了新数组 | 可视区内每一项，**原地更新**内容，DOM 全部复用 |
| `refreshItems([key])` | 改了数据又没走 `setList` | 只动指定的那几项，重建它们的 DOM |
| `forceUpdate()` | 图省事的一档；或所有项的高度同时变了（如批量折叠） | 全部可见项，重建 DOM |

能指明 key 时优先用 `refreshItems([key])` 而不是 `forceUpdate()`，长列表里差别看得出来。

<PlaygroundHost framework="vanilla" example-id="list-reactive" />
