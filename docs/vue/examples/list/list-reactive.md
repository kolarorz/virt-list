# Vue - 响应式更新

演示两种改数据的方式，切换「更新方式」即可对比：

- **换新数组**（推荐）：`list.value = list.value.map(...)`。组件识别到 `list` 换了，
  把最新数据交给可视区内的每一项，行上的轮次跟着涨——不需要任何手动调用。
- **原地修改**：直接改某一项的字段。示例用 `shallowRef` 存列表（大数据量下应当如此），
  Vue 不代理数组元素，引用与长度也都没变——谁都察觉不到，行上的轮次会停住，
  点 `refreshItems()` 才追上。

## 它是怎么知道数据变了的

库自己**不侦测**数据变化，一次都不——侦测交给框架，库只提供入口。`@virt-list/vue` 内部就是一个 watch：

```js
// packages/vue/src/VirtList.ts
watch([() => props.list, () => props.list.length], () => {
  vl.setList(props.list);   // 通知库：数据换了
});
```

它只比**两个标量**：数组引用和长度（`O(1)`，不遍历、不深比较）。所以：

- 换新数组 → 引用变了 → 发现 → 库把可视区内每一项的最新数据交还给插槽重新渲染
- 原地改字段 → 引用和长度都没变 → **发现不了**

滚动与尺寸上报不走这条路，所以这套机制不影响滚动性能。

另外 Vue 自己还有一条更细的通道：列表存在 `ref` 里时，插槽读到的是响应式属性，
改它会由依赖收集直接更新那一格，连 `setList` 都不经过。示例用 `shallowRef`（大数据量下
应当如此），刻意关掉了这条通道，好让「察觉不到」的情形可见。

## 三种更新手段的分工

| 手段 | 什么时候用 | 范围与代价 |
|---|---|---|
| **自动**（推荐） | 换新数组 | 可视区内每一项，**原地更新**内容，DOM 全部复用 |
| `refreshItems([key])` | 原地修改，且框架察觉不到 | 只动指定的那几项，重建它们的 DOM |
| `forceUpdate()` | 兜底：不确定哪几项变了，或所有项的高度同时变了（如批量折叠） | 全部可见项，重建 DOM |

`forceUpdate()` 是范围最大的一个，重建可见项的全部 DOM。能指明 key 时优先用
`refreshItems([key])`，长列表里差别看得出来。

:::tip 大数据量用 shallowRef，并全程换新数组
`shallowRef` 不会递归代理数组内部对象，十万条数据的初始化开销小得多。代价是**任何原地修改**
都察觉不到——包括 `push` / `splice`。所以增删改统一换成新数组，一条规则覆盖所有情况：

```js
list.value = [...list.value, newRow];                                        // 增
list.value = list.value.filter((it) => it.id !== id);                        // 删
list.value = list.value.map((it) => (it.id === id ? { ...it, name } : it));   // 改
```

`ref` 存的列表不受这条限制（数组被深度代理），但要付初始化开销。详见「深入 → 设计决策」。
:::

<PlaygroundHost framework="vue" example-id="list-reactive" />
