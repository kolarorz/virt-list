# 流式输出与贴底跟随

AI 回答是逐 token 流入的：**同一条消息**的高度在几秒内会变几十次。
这一节讲的是在这种持续变化中，视口该怎么动、以及什么时候不该动。

<PlaygroundHost framework="vue" example-id="ai-streaming" />

::: tip 对照着试
点「提问」看跟随；生成中向上滚，状态行会变成「已脱离跟随」；
再手动滚回底部，跟随恢复。这三个动作正是下面表格里的三行。
:::

<!--@include: ../../_shared/ai-streaming.md-->

## Vue 写法

响应式帮了大忙：改一个属性，模板只更新那一个文本节点，列表结构完全不动。
但有一个坑必须注意——**改的必须是响应式对象**：

```ts
const list = ref<AiMessage[]>([]);

function appendChunk(chunk: string) {
  // ✅ 从 list.value 里取出来的是 Proxy，改它会触发更新
  const target = list.value[list.value.length - 1];
  if (target) target.text += chunk;
}

function wrong(answer: AiMessage, chunk: string) {
  // ❌ answer 是 push 之前的原始对象，不经过 Proxy，改了界面不会变
  answer.text += chunk;
}
```

完整配置：

```vue
<template>
  <VirtList
    ref="vlRef"
    :list="list"
    item-key="id"
    :estimated-size="80"
    initial-position="bottom"
    sticky-bottom
    :has-more-bottom="false"
    :load-more="onLoadMore"
    @scroll="(e) => (atBottom = e.atEnd)"
    @load-state-change="(s) => (pendingNew = s.pendingNew)"
  >
    <template #default="{ itemData }">
      <div class="bubble">
        <span>{{ itemData.text }}</span>
        <span v-if="itemData.streaming" class="caret" />
      </div>
    </template>
  </VirtList>
</template>
```

`@scroll` 的载荷里有 `atEnd`，用它决定「回到底部」按钮要不要亮。
