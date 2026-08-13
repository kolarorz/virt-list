# 响应式更新

演示两种改数据的方式，切换「更新方式」即可对比：

- **换新数组**（推荐）：换成新数组后 `setList(list)`。组件通过 `updateItem` 把最新数据
  交给可视区内的每一项，行上的轮次跟着涨。
- **原地修改**：直接改字段、也不调 `setList`。组件完全不知道数据动过，行上的轮次会停住，
  点 `refreshItems()` 才追上。

## 它是怎么知道数据变了的

它不知道——**纯 DOM 用法下没有任何侦测机制**，是你调 `setList` 告诉它的。

框架包（vue / react 等）里这一步由框架代劳：内部一个 `watch` 比较数组引用与长度，变了就替你
调 `setList`。vanilla 没有那一层，所以这是唯一的入口。

收到通知后，库对渲染池里已有的项调 `updateItem`，把最新的 item 交回来。**这个回调必须由你
提供**，否则同一个 key 的项内容会停在挂载那一刻：

```js
new VirtList(container, {
  list,
  itemKey: 'id',
  renderItem: (item, index, el) => paint(item, el),
  updateItem: (item, index, el) => paint(item, el),  // 常常就是同一个函数
});
```

之所以要分成两个回调而不是重跑 `renderItem`：后者的返回值会被 `appendChild`，
复用时再调一次会重复追加子节点。`updateItem` 返回 `void`，语义就是「原地更新」。

滚动与尺寸上报**不会**触发 `updateItem`（那是每帧都在发的），所以不必担心影响滚动性能。

## 三种更新手段的分工

| 手段 | 什么时候用 | 范围与代价 |
|---|---|---|
| `setList()` + `updateItem` | 数据换了新数组 | 可视区内每一项，**原地更新**内容，DOM 全部复用 |
| `refreshItems([key])` | 改了数据又没走 `setList` | 只动指定的那几项，重建它们的 DOM |
| `forceUpdate()` | 兜底：不确定哪几项变了，或所有项的高度同时变了（如批量折叠） | 全部可见项，重建 DOM |

`forceUpdate()` 是范围最大的一个，重建可见项的全部 DOM。能指明 key 时优先用
`refreshItems([key])`，长列表里差别看得出来。

:::warning 原地修改会「偶尔看起来能工作」
库持有的就是你传进来的那个数组对象，原地改动到的就是它。所以只要随后恰好发生一次滚动或
尺寸变化，新数据就会冒出来——但没有那次触发时它不会。这种时好时坏比彻底不工作更难查，
所以改完数据请明确走 `setList()` 或 `refreshItems()` 之一。
:::

<PlaygroundHost framework="vanilla" example-id="list-reactive" />
