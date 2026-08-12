<template>
  <div class="demo-panel">
    <div class="demo-chat-toolbar">
      <input v-model="input" class="demo-input" type="search" placeholder="搜索会话内容，如「不定高」「滚动」" />
      <button type="button" class="virt-list-btn" :disabled="hits.length === 0" @click="jumpTo(cursor - 1)">
        上一个
      </button>
      <button type="button" class="virt-list-btn" :disabled="hits.length === 0" @click="jumpTo(cursor + 1)">
        下一个
      </button>
      <span class="demo-hint">{{ counterText }}</span>
    </div>
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList ref="vlRef" :list="list" item-key="id" :estimated-size="140" @update="onUpdate">
        <template #default="{ itemData, index }">
          <!--
            高亮直接跟着 keyword 走：响应式框架下不需要手动清渲染池，
            关键词变了命中分段会自己重新算
          -->
          <AgentMessage
            :message="itemData"
            :index="index"
            :keyword="keyword"
            :current-hit="isCurrent(index)"
          />
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VirtList } from '@virt-list/vue2';
import { generateAiPage, type AiMessage } from '../../../../_shared/aiData';
import { blocksToSearchText } from '../../../../_shared/agentBlocks';
import AgentMessage from './parts/AgentMessage.vue';

const COUNT = 600;

const vlRef = ref<typeof VirtList | null>(null);
const list = ref<AiMessage[]>(generateAiPage(1, COUNT));
const input = ref('');
const keyword = ref('');
const cursor = ref(-1);
const listState = ref<any>(null);

/**
 * 命中位置来自**数据**，不是 DOM。
 *
 * 浏览器的页内查找只能看到当前渲染的那几十项，600 条里绝大多数没有对应的 DOM。
 * 搜的是正文块的文本——和界面上画黄底的地方是同一份文本，两边不会打架。
 */
const hits = computed(() => {
  const kw = keyword.value;
  if (!kw) return [] as number[];
  return list.value.reduce<number[]>((acc, item, i) => {
    if (blocksToSearchText(item.blocks).includes(kw)) acc.push(i);
    return acc;
  }, []);
});

const counterText = computed(() => {
  if (!keyword.value) return '';
  if (hits.value.length === 0) return '没有匹配';
  return `第 ${cursor.value + 1} / ${hits.value.length} 个命中`;
});

const statsText = computed(() =>
  [
    `消息数: ${list.value.length}`,
    `渲染区间: ${listState.value?.renderBegin ?? '-'} - ${listState.value?.renderEnd ?? '-'}`,
    hits.value.length > 0 ? `命中 ${hits.value.length} 条（含未渲染项）` : '未搜索',
  ].join(' | '),
);

const isCurrent = (index: number) =>
  cursor.value >= 0 && hits.value[cursor.value] === index;

function jumpTo(next: number) {
  if (hits.value.length === 0) return;
  cursor.value = (next + hits.value.length) % hits.value.length;
  // 目标项此刻多半还没渲染，只能按预估尺寸落位；渲染出来量到真实尺寸后
  // 位置会自动修正，所以这里不需要自己算偏移量
  vlRef.value?.scrollToIndex(hits.value[cursor.value]!, { align: 'start' });
}

let debounce: number | null = null;
watch(input, (next) => {
  if (debounce !== null) clearTimeout(debounce);
  debounce = window.setTimeout(() => {
    keyword.value = next.trim();
    cursor.value = hits.value.length > 0 ? 0 : -1;
    if (cursor.value >= 0) jumpTo(0);
  }, 200);
});

function onUpdate(_list: AiMessage[], state: any) {
  listState.value = state;
}
</script>
