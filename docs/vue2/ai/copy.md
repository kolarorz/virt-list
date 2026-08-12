# 整段复制

虚拟滚动只保留视口附近的 DOM。用户选中的范围跨越了未渲染区域时，浏览器能复制到的
只有那几十个还活着的节点——中间成百上千项在剪贴板里凭空消失，**而用户完全看不出来**，
因为选区高亮是连续的。

这是虚拟滚动最容易被忽略的一处正确性缺口，而「复制整段回答」恰好是 AI 产品的核心操作。

<PlaygroundHost framework="vue2" example-id="ai-copy" />

::: tip 怎么看出差别
点「选中全部对话」，再按 `Cmd/Ctrl+C`，粘贴到任意编辑器里：开着开关能拿到全部
400 条，关掉之后只剩视口附近的十几条。工具栏右侧会显示这次实际复制了多少字、
其中多少来自未渲染的项。
:::

## 开启方式

```vue
<template>
  <VirtList
    :list="list"
    item-key="id"
    :estimated-size="80"
    :copy-text="copyText"
    :copy-separator="SEPARATOR"
  >
    <template #default="{ itemData }">
      <div class="bubble">{{ copyText(itemData) }}</div>
    </template>
  </VirtList>
</template>

<script setup lang="ts">
/** 渲染与复制共用同一个格式化函数，保证复制到的与看到的一致 */
const copyText = (item: AiMessage) =>
  `${item.role === 'user' ? '我' : 'AI'}：${blocksToMarkdown(item.blocks)}`;

/**
 * 必须**绑定**而不是写成属性字面量：
 * 模板里的 copy-separator="\n\n" 会被当作反斜杠加 n 这两个字符，不是换行。
 */
const SEPARATOR = '\n\n';
</script>
```

传 `undefined` 即关闭，连 copy 监听都不会挂：

```vue
<VirtList :copy-text="enabled ? copyText : undefined" />
```

<!--@include: ../../_shared/ai-copy.md-->
