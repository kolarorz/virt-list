# 整段复制

虚拟滚动只保留视口附近的 DOM。用户选中的范围跨越了未渲染区域时，浏览器能复制到的
只有那几十个还活着的节点——中间成百上千项在剪贴板里凭空消失，**而用户完全看不出来**，
因为选区高亮是连续的。

这是虚拟滚动最容易被忽略的一处正确性缺口，而「复制整段回答」恰好是 AI 产品的核心操作。

<PlaygroundHost framework="vanilla" example-id="ai-copy" />

::: tip 怎么看出差别
点「选中全部对话」，再按 `Cmd/Ctrl+C`，粘贴到任意编辑器里：开着开关能拿到全部
400 条，关掉之后只剩视口附近的十几条。工具栏右侧会显示这次实际复制了多少字、
其中多少来自未渲染的项。
:::

## 开启方式

给出 `copyText`，返回这一项对应的纯文本：

```js
const vl = new VirtList(container, {
  list,
  itemKey: 'id',
  estimatedSize: 80,
  // 给出即开启；不给则完全不挂 copy 监听，行为与从前一致
  copyText: (item) => `${item.role === 'user' ? '我' : 'AI'}：${item.text}`,
  // 各项之间的分隔符，默认换行
  copySeparator: '\n\n',
  renderItem: (item) => { /* ... */ },
});
```

运行时可以开关它：`vl.updateOptions({ copyText: undefined })` 会把监听摘掉。

<!--@include: ../../_shared/ai-copy.md-->

## 让渲染与复制共用一个格式化函数

```js
const format = (item) => `${item.role === 'user' ? '我' : 'AI'}：${item.text}`;

const vl = new VirtList(container, {
  // ...
  copyText: format,
  renderItem: (item) => {
    const el = document.createElement('div');
    el.textContent = format(item);
    return el;
  },
});
```
