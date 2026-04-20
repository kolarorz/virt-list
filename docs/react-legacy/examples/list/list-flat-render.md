# React Legacy - 扁平渲染（默认支持）

演示 children / render props 内容直接渲染到 item wrapper 中，无额外 DOM 包裹层。

:::tip 扁平渲染
VirtList 将 React 元素直接渲染到各容器元素中，不产生多余的包裹节点，实现完全扁平的 DOM 结构。

**实现原理**

React 16 / 17 使用传统的 `ReactDOM.render()` API 进行客户端渲染。VirtList 内部通过 `createElement(Fragment, null, node)` 将 `ReactNode` 包裹在 **Fragment** 中，再调用 `ReactDOM.render()` 渲染到目标容器元素。Fragment 是 React 提供的虚拟容器，不会在 DOM 中产生任何实际节点，因此 children 内容（无论单节点或多节点）均作为容器的直接子节点挂载，**零额外包裹层**。

对比插槽 demo 中每个 children 外层都有一个 `<div>` 包裹，扁平模式显著减少了 DOM 嵌套层级，有利于降低 Reflow / Repaint 成本。

如需在 item wrapper 上设置样式，可使用 `itemClass` / `itemStyle` props。
:::

<PlaygroundHost framework="react-legacy" example-id="list-flat-render" />
