# Vue 2 - 响应式更新

演示列表数据定时刷新，通过原地修改数据 + `forceUpdate()` 驱动虚拟列表重渲染可视区域内的内容。

:::tip 性能建议
大数据量场景下，建议使用 `shallowRef` 或 `原生数组` 代替 `ref` / `reactive` 存放列表数据。

`ref` 会对数组中每个对象及其属性创建深度响应式代理，万级数据量时会产生明显的内存和初始化开销。使用 `shallowRef` 仅追踪数组引用本身的变化，数据更新时原地修改后调用 `forceUpdate()` 即可刷新视图，性能更优。

- **增删数据**（length 变化）：直接替换数组引用，虚拟列表自动响应。
- **修改已有项**（length 不变）：原地修改后调用 `forceUpdate()`。
  :::

<PlaygroundHost framework="vue2" example-id="list-reactive" />
