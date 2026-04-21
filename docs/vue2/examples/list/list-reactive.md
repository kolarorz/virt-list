# Vue 2 - 响应式更新

演示列表数据定时刷新，通过原地修改数据 + `forceUpdate()` 驱动虚拟列表重渲染可视区域内的内容。

:::tip 重要提示
为了列表的最大性能，整个列表不再提供 Vue 的响应式更新。所有可视区的数据更新必须使用`forceUpdate()`
:::

<PlaygroundHost framework="vue2" example-id="list-reactive" />
