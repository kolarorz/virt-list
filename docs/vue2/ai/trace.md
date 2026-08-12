# Agent 执行流

Agent 的执行轨迹——思考、工具调用、命令输出、报错——是一类和聊天不同的列表：
它的节奏由机器决定，一秒十几行很常见，而且随时可能一次性灌进上万行。

<PlaygroundHost framework="vue2" example-id="ai-trace" />

::: tip 值得试的四件事
1. 点「开始执行」，日志持续追加，视口贴底跟随；
2. 执行中**向上滚**去看某段历史——下面刷得再快也不会把视口拽走；
3. 点「灌入 1 万行」，看状态行里的追加耗时；
4. 点「展开全部工具调用」——几百行同时从一行变成九行，这是最容易露白的时刻。
:::

<!--@include: ../../_shared/ai-trace.md-->

## Vue 2 写法

```vue
<template>
  <VirtList
    ref="vlRef"
    :list="list"
    item-key="id"
    :estimated-size="24"
    initial-position="bottom"
    sticky-bottom
    :has-more-top="false"
    :has-more-bottom="false"
    :copy-text="copyText"
    @scroll="(e) => (atBottom = e.atEnd)"
  >
    <!-- 当前阶段悬浮在顶部：滚到哪一段就显示那一段的标题 -->
    <template #stickyHeader>
      <div class="stage">{{ currentSection?.title ?? '等待执行' }}</div>
    </template>

    <template #default="{ itemData }">
      <div class="line" :class="`kind-${itemData.kind}`">
        <div class="head" @click="itemData.detail && toggle(itemData)">
          <span class="status" :class="`is-${itemData.status}`">{{ statusIcon(itemData.status) }}</span>
          <span>{{ itemData.text }}</span>
          <span v-if="itemData.ms > 0" class="ms">{{ formatMs(itemData.ms) }}</span>
        </div>
        <!-- 展开后是终端回显或一段 diff，和消息里的工具卡共用一个渲染组件 -->
        <AgentOutput v-if="itemData.detail && itemData.expanded"
          :text="itemData.detail" :kind="itemData.outputKind" />
      </div>
    </template>
  </VirtList>
</template>

<script setup lang="ts">
/** 批量追加：一次 concat 提交一批，而不是每行一次 */
function append(count: number) {
  // 上一批末尾那行还标着「执行中」，先落终态——要从 list.value 里取，那才是响应式对象
  const prev = list.value[list.value.length - 1];
  if (prev?.status === 'running') prev.status = 'ok';

  const batch = Array.from({ length: count }, () => createTraceLine(seq++));
  list.value = list.value.concat(batch);
}

/** 阶段划分是纯数据计算，和语义滚动条示例用的是同一个函数 */
const sections = computed(() => buildOutline(list.value));
const currentSection = computed(
  () => sections.value[activeSection(sections.value, listState.value?.inViewBegin ?? 0)],
);

/** 展开状态存在数据里，行被回收再渲染时不会丢 */
function toggle(item: TraceLine) {
  item.expanded = !item.expanded;
}

/** 一次展开全部：改的是响应式数据，模板会自己重渲染 */
function toggleAll(expand: boolean) {
  for (const line of list.value) {
    if (line.detail) line.expanded = expand;
  }
}
</script>
```

::: tip 不需要清渲染池
`expanded` 是响应式数据，改了模板会自己更新。
（vanilla 版本因为不走响应式，一次改很多行时需要 `clearItemPool()`。）
:::
