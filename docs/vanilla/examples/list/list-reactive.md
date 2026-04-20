# Vanilla - 响应式更新

演示 `forceUpdate()` 的使用：定时刷新列表数据，虚拟列表自动更新可视区域内的 DOM 内容。

:::tip 性能建议
Vanilla 版本无响应式系统开销，是大数据量场景下性能最优的选择。

- **增删数据**（length 变化）：调用 `setList(newList)` 替换数据源。
- **修改已有项**（length 不变）：原地修改后调用 `forceUpdate()`。
:::

<PlaygroundHost framework="vanilla" example-id="list-reactive" />
