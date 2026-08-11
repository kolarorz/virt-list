# 会话历史

一个长期使用的 AI 对话，历史消息很容易累积到几万条。这一节讲三件事：
往上翻历史、翻历史期间收到新消息、以及在会话之间切换。

基础的 `loadMore` 模型见 [分页与无限加载](../guide/load-more)，
这里只讲对话场景特有的部分。

下面这个示例就带着向上加载：滚到顶部会拉取更早的对话，
生成过程中向上翻历史时收到的新消息会记成未读数。

<PlaygroundHost framework="vue" example-id="ai-streaming" />

<!--@include: ../../_shared/ai-history.md-->

## Vue 写法

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
    @load-state-change="onLoadStateChange"
  >
    <template #default="{ itemData }">{{ itemData.text }}</template>
  </VirtList>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import type { LoadDirection, LoadState } from '@virt-list/vue';

const vlRef = ref<typeof VirtList | null>(null);
const list = ref<Message[]>([]);
const pendingNew = ref(0);

async function onLoadMore(direction: LoadDirection) {
  if (direction !== 'top') return false;
  const older = await fetchHistory();
  // 数据所有权在使用方，直接改 list 即可，不用手动通知组件
  list.value = older.concat(list.value);
  return older.length > 0;
}

function onLoadStateChange(state: LoadState) {
  pendingNew.value = state.pendingNew;
}

function switchConversation(messages: Message[]) {
  vlRef.value?.reset();       // 清空尺寸缓存与滚动状态
  list.value = messages;
  vlRef.value?.scrollToBottom();
}
</script>
```
