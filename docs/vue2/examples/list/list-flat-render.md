# Vue 2 - 扁平渲染 （不支持）

:::tip 场景分析

Vue 2 的 Virtual DOM 要求每个组件的 `render` 函数必须返回**单个根 VNode**（但 vue2 不支持 Fragment），因此 VirtList 在内部针对 slot 返回的 VNode 数量采用不同的渲染策略：

- **单根节点**（常见场景）：slot 返回的唯一 VNode 直接作为 Vue 实例的根节点渲染，**无任何额外包裹层**。由于 Vue 2 的 SFC 模板本身强制单根，绝大多数场景均走此路径。
- **多根节点**（render 函数 / JSX 场景）：由于 Vue 2 缺少 Fragment 支持，多个 VNode 会被包裹在一个设置了 `className: virt-list-slot-wrapper` 的 `<div>` 中，在浏览器 api 允许的情况下，可以给该元素设置 `display: contents`, 该 CSS 属性使容器节点在布局计算中**完全透明**——子元素的 Flex / Grid 排列、`:first-child` 等伪类选择器均表现为直接挂载在父容器下，视觉与行为上等同于无包裹。

推荐使用 `单根节点`，便于设置 class 和 style

如需在 item wrapper 上设置样式，可使用 `item-class` / `item-style` props。
:::

示例中使用多根节点，所以会默认生成一个 `virt-list-slot-wrapper.div` 包裹

<PlaygroundHost framework="vue2" example-id="list-flat-render" />
