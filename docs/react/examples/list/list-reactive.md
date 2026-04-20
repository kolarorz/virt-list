# React - 响应式更新

演示列表数据定时刷新，通过原地修改数据 + `forceUpdate()` 驱动虚拟列表重渲染可视区域内的内容。

:::tip 性能建议
大数据量场景下，更新已有项时建议原地修改属性后调用 `forceUpdate()`，而非通过 `setState` 创建新数组（如 `[...list]` 或 `list.map(...)`）。这样可以避免大量对象的重建与 GC 开销。

- **增删数据**（length 变化）：通过 `setState` 替换数组引用，虚拟列表自动响应。
- **修改已有项**（length 不变）：原地修改后调用 `forceUpdate()`。
:::

<PlaygroundHost framework="react" example-id="list-reactive" />
