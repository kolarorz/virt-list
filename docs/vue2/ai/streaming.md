# 流式输出与贴底跟随

AI 回答是逐 token 流入的：**同一条消息**的高度在几秒内会变几十次。
这一节讲的是在这种持续变化中，视口该怎么动、以及什么时候不该动。

<PlaygroundHost framework="vue2" example-id="ai-streaming" />

::: tip 对照着试
点「提问」看跟随；生成中向上滚，状态行会变成「已脱离跟随」；
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
