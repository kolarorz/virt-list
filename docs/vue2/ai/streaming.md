---
description: Vue 2 流式聊天虚拟列表示例：动态消息高度、自动贴底、向上阅读时停止跟随，以及回到底部恢复跟随。
---

# 流式输出与贴底跟随

AI 回答是逐 token 流入的：**同一条消息**的高度在几秒内会变几十次。
这一节讲的是在这种持续变化中，视口该怎么动、以及什么时候不该动。

<PlaygroundHost framework="vue2" example-id="ai-streaming" />

::: tip 对照着试
发送一个问题看跟随；生成中向上滚，状态行会变成「已脱离跟随」；
再手动滚回底部，跟随恢复。这三个动作正是下面表格里的三行。
:::

<!--@include: ../../_shared/ai-streaming.md-->

## Vue 2 的三个额外注意点

这三条都是把示例从 Vue 3 移植过来时实际踩到的，与虚拟列表无关，
但在 AI 场景里特别容易撞上：

**一、响应式属性必须在创建时就存在。**
Vue 2 侦测不到「对象创建之后才新增」的属性。流式消息的 `streaming`、
日志行的 `expanded` 这类开关，造数据时就要写死初值：

```ts
// ✅ 造数据时给全字段
{ id, text: '', streaming: false }

// ❌ 之后再 msg.streaming = true，界面不会有反应
```

**二、`<template v-for>` 不能带 `key`。** 搜索高亮要把文本切成多段渲染，
`key` 只能落在内部元素上：

```vue
<template v-for="(part, i) in parts">
  <mark v-if="part.hit" :key="`hit-${i}`">{{ part.text }}</mark>
  <span v-else :key="`text-${i}`">{{ part.text }}</span>
</template>
```

**三、模板表达式里不能写 TS 语法。** Vue 2.7 的模板编译器按纯 JS 解析表达式，
非空断言会直接报语法错误——把它提到 `<script>` 里算好再用：

```ts
// script 里 ! 是合法的
const mergedWidth = `${COLUMNS[0]!.width + COLUMNS[1]!.width}px`;
```

## Vue 2 写法

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

::: tip Vue 2 的两处差别
`<template v-for>` 上不能放 `:key`，key 要落在里面的真实元素上；
另外**造数据时就得把 `expanded`、`status` 这些后续会变的字段写出来**——
Vue 2 侦测不到创建之后才出现的属性，字段缺失的表现是点了展开毫无反应。
:::
