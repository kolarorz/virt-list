# 整段复制

虚拟滚动只保留视口附近的 DOM。用户选中的范围跨越了未渲染区域时，浏览器能复制到的
只有那几十个还活着的节点——中间成百上千项在剪贴板里凭空消失，**而用户完全看不出来**，
因为选区高亮是连续的。

这是虚拟滚动最容易被忽略的一处正确性缺口，而「复制整段回答」恰好是 AI 产品的核心操作。

<PlaygroundHost framework="react" example-id="ai-copy" />

::: tip 怎么看出差别
点「选中全部对话」，再按 `Cmd/Ctrl+C`，粘贴到任意编辑器里：开着开关能拿到全部
400 条，关掉之后只剩视口附近的十几条。工具栏右侧会显示这次实际复制了多少字、
其中多少来自未渲染的项。
:::

## 开启方式

```tsx
/** 渲染与复制共用同一个格式化函数，保证复制到的与看到的一致 */
const copyText = (item: AiMessage) =>
  `${item.role === 'user' ? '我' : 'AI'}：${blocksToMarkdown(item.blocks)}`;

<VirtList<AiMessage>
  list={list}
  itemKey="id"
  estimatedSize={80}
  copyText={enabled ? copyText : undefined}
  copySeparator={'\n\n'}
>
  {({ itemData }) => <div className="bubble">{copyText(itemData)}</div>}
</VirtList>
```

传 `undefined` 即关闭，连 copy 监听都不会挂。

::: tip copyText 可以是内联箭头函数
每次渲染产生新的函数引用不会有额外开销——组件只关心「有没有给」，
不会因为引用变了而重挂监听。
:::

<!--@include: ../../_shared/ai-copy.md-->
