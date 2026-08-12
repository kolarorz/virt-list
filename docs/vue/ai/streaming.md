# 流式输出与贴底跟随

AI 回答是逐 token 流入的：**同一条消息**的高度在几秒内会变几十次。
这一节讲的是在这种持续变化中，视口该怎么动、以及什么时候不该动。

<PlaygroundHost framework="vue" example-id="ai-streaming" />

::: tip 对照着试
发送一个问题看跟随；生成中向上滚，状态行会变成「已脱离跟随」；
再手动滚回底部，跟随恢复。这三个动作正是下面表格里的三行。
:::

<!--@include: ../../_shared/ai-streaming.md-->

## Vue 写法

响应式帮了大忙：改一个属性，模板只更新那一个文本节点，列表结构完全不动。
但有一个坑必须注意——**改的必须是响应式对象**：

```ts
const list = ref<AiMessage[]>([]);

/** 块内追加：每秒几十次，只改一个属性 */
function appendChunk(chunk: string) {
  // ✅ 从 list.value 一路取下来的都是 Proxy，改它会触发更新
  const msg = list.value[list.value.length - 1];
  const block = msg?.blocks[msg.blocks.length - 1];
  if (block?.kind === 'text') block.text += chunk;
}

/** 插入新块：一次回答里只有几次，动的是结构，高度会跳变 */
function pushBlock(block: AgentBlock) {
  list.value[list.value.length - 1]?.blocks.push(block);
}

function wrong(answer: AiMessage, chunk: string) {
  // ❌ answer 是 push 之前的原始对象，不经过 Proxy，改了界面不会变
  answer.blocks[0].text += chunk;
}
```

完整配置：

```vue
<template>
  <VirtList
    ref="vlRef"
    :list="list"
    item-key="id"
    :estimated-size="140"
    initial-position="bottom"
    sticky-bottom
    :has-more-bottom="false"
    :load-more="onLoadMore"
    @scroll="(e) => (atBottom = e.atEnd)"
    @load-state-change="(s) => (pendingNew = s.pendingNew)"
  >
    <template #default="{ itemData }">
      <!-- 一条消息由若干块拼成；正在生成的那条把光标挂在最后一个块上 -->
      <AgentMessage :message="itemData" :streaming="itemData.id === streamingId" />
    </template>
  </VirtList>
</template>
```

渲染项里的展开与折叠直接改数据，不要用组件内部的局部状态：

```vue
<script setup lang="ts">
/** 折叠一张工具卡：改的是列表数据，项被回收再渲染时状态不会丢 */
function toggle(block: AgentToolBlock) {
  block.expanded = !block.expanded;
}
</script>
```

`@scroll` 的载荷里有 `atEnd`，用它决定「回到底部」按钮要不要亮。
