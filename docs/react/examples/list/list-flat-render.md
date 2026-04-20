# React - 扁平渲染（默认支持）

演示 children / render props 内容直接渲染到 item wrapper 中，无额外 DOM 包裹层。

:::tip 扁平渲染
VirtList 将 React 元素直接渲染到各容器元素中，不产生多余的包裹节点，实现完全扁平的 DOM 结构。

**实现原理**

React 18 引入了 `createRoot` API 作为新的客户端渲染入口。VirtList 内部为每个挂载点调用 `createRoot(el)` 创建独立的 React Root，再通过 `root.render(node)` 将 `ReactNode` 渲染到目标容器中。React 原生支持 **Fragment**（`<>...</>`），`createRoot` 能够直接处理 Fragment 节点——其子元素会作为容器的直接子节点挂载，不引入任何额外的 DOM 包裹层。

对比插槽 demo 中每个 children 外层都有一个 `<div>` 包裹，扁平模式显著减少了 DOM 嵌套层级，有利于降低 Reflow / Repaint 成本。

如需在 item wrapper 上设置样式，可使用 `itemClass` / `itemStyle` props。
:::

<PlaygroundHost framework="react" example-id="list-flat-render" />
