# Vue - 扁平渲染（默认支持）

演示 slot 内容直接渲染到 item wrapper 中，无额外 DOM 包裹层。

:::tip 扁平渲染
VirtList 将 slot 返回的 VNode 直接渲染到各容器元素中，不产生多余的包裹节点，实现完全扁平的 DOM 结构。

**实现原理**

Vue 3 原生支持 **Fragment**——允许组件返回多个根节点而无需单根包裹。VirtList 内部通过 `render(h(Fragment, null, vNodes), el)` 将 slot 返回的 VNode 数组以 Fragment 形式直接渲染到目标容器元素中。Fragment 是一个虚拟容器，不会在 DOM 中产生任何实际节点，因此 slot 内容（无论单根或多根）均作为容器的直接子节点挂载，**零额外包裹层**。

对比「插槽」demo 中每个 slot 内容外层都有一个 `<div>` 包裹，扁平模式显著减少了 DOM 嵌套层级，有利于降低 Reflow / Repaint 成本。

如需在 item wrapper 上设置样式，可使用 `item-class` / `item-style` props。
:::

<PlaygroundHost framework="vue" example-id="list-flat-render" />
