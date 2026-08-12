# 搜索与引用跳转

会话内搜索、RAG 引用跳转、「定位到这条消息」都是同一件事：
**在数据里找到目标，再把视口移到它那儿**。

<PlaygroundHost framework="vue2" example-id="ai-search" />

::: tip 试试
搜「不定高」或「滚动」，用「上一个 / 下一个」在命中之间跳。
状态行里的命中数是**数据层**的总数，包含那些还没渲染的项——
这正是浏览器查找做不到的部分。
:::

<!--@include: ../../_shared/ai-search.md-->

## Vue 2 写法

命中列表用 `computed`，高亮直接跟着 `keyword` 走——
不需要手动通知组件重渲染，这是响应式框架在这件事上的便利：

```vue
<template>
  <VirtList ref="vlRef" :list="list" item-key="id" :estimated-size="140">
    <template #default="{ itemData, index }">
      <!-- keyword 传下去，正文块内部按命中分段渲染 -->
      <AgentMessage
        :message="itemData"
        :index="index"
        :keyword="keyword"
        :current-hit="isCurrent(index)"
      />
    </template>
  </VirtList>
</template>

<script setup lang="ts">
const keyword = ref('');
const cursor = ref(-1);

/** 命中位置来自数据，不是 DOM */
const hits = computed(() => {
  if (!keyword.value) return [] as number[];
  return list.value.reduce<number[]>((acc, item, i) => {
    if (blocksToSearchText(item.blocks).includes(keyword.value)) acc.push(i);
    return acc;
  }, []);
});

const isCurrent = (index: number) =>
  cursor.value >= 0 && hits.value[cursor.value] === index;

function jumpTo(next: number) {
  if (hits.value.length === 0) return;
  cursor.value = (next + hits.value.length) % hits.value.length;
  vlRef.value?.scrollToIndex(hits.value[cursor.value]!, { align: 'start' });
}
</script>
```

默认插槽的第二个参数 `index` 就是该项在完整列表里的索引，可以直接和命中比对。
