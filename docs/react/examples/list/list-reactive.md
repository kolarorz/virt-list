# 响应式更新

演示两种改数据的方式，切换「更新方式」即可对比：

- **换新数组**（推荐）：`setList(rows.map(...))`。组件识别到 `list` 换了，
  把最新数据交给可视区内的每一项，行上的轮次跟着涨。
- **原地修改**：直接改某一项的字段。行上的轮次**也能跟上**，但走的是另一条路
  （见下），并且依赖宿主恰好重渲染过。

## 它是怎么知道数据变了的

库自己**不侦测**数据变化，一次都不——侦测交给框架，库只提供入口。`@virt-list/react` 内部是宿主每次
渲染后的一次比较：

```js
// packages/react/src/VirtList.ts
useLayoutEffect(() => {
  if (props.list !== prevList || props.list.length !== prevLen) {
    vl.setList(props.list);      // 通知库：数据换了
  }
  mounter.flushMounts();          // 顺带把挂载点用最新的 children 闭包重刷一遍
});
```

第一句只比**两个标量**：数组引用和长度（`O(1)`，不遍历、不深比较）。换新数组会被它发现，
原地改字段不会。

第二句是 React 侧特有的兜底：每项的内容渲染在独立的 root 里、不在宿主的 vdom 树上，
所以每次宿主渲染后都用最新闭包重刷一遍。**这也是本示例里「原地修改」照样能跟上的原因**——
闭包里就是那几个被改过的对象。真正会停住的是连宿主都不重渲染的情形（数据由外部 store
或 WebSocket 直写），那时才需要 `refreshItems()`。

## 三种更新手段的分工

| 手段 | 什么时候用 | 范围与代价 |
|---|---|---|
| **自动**（推荐） | 换新数组 | 可视区内每一项，**原地更新**内容，DOM 全部复用 |
| `refreshItems([key])` | 原地修改，且框架察觉不到 | 只动指定的那几项，重建它们的 DOM |
| `forceUpdate()` | 兜底：不确定哪几项变了，或所有项的高度同时变了（如批量折叠） | 全部可见项，重建 DOM |

`forceUpdate()` 是范围最大的一个，重建可见项的全部 DOM。能指明 key 时优先用
`refreshItems([key])`，长列表里差别看得出来。

<PlaygroundHost framework="react" example-id="list-reactive" />
