# Vanilla - 扁平渲染

演示如何利用 `el` 回调参数减少 DOM 层级，让子元素直接挂载到 item wrapper 上。

:::tip 两种渲染模式
所有 render 函数（`renderItem`、`renderHeader`、`renderFooter`、`renderStickyHeader`、`renderStickyFooter`）均支持两种用法：

**传统模式** — 返回一个元素，自动 `appendChild` 到容器中：
```js
renderItem: (item) => {
  const div = document.createElement('div');
  div.innerHTML = `<span>${item.text}</span>`;
  return div; // 额外多一层 <div> 包裹
}
```

**扁平模式** — 直接操作第三个参数 `el`（item wrapper），不返回值：
```js
renderItem: (item, index, el) => {
  el.innerHTML = `<span>${item.text}</span>`;
  // 子元素直接挂在 wrapper 上，少一层嵌套
}
```

扁平模式适用于对 DOM 层级敏感的场景（如表格行、高频滚动列表），可以减少不必要的嵌套，简化 CSS 选择器。两种模式完全向后兼容，可在同一个列表中混用。
:::

<PlaygroundHost framework="vanilla" example-id="list-flat-render" />
