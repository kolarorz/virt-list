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
      <VirtList ref="vlRef" :list="list" item-key="id" :estimated-size="80" @update="onUpdate">
        <template #default="{ itemData, index }">
          <div class="demo-chat-message demo-ai-row" :class="{ 'is-user': itemData.role === 'user' }">
            <div class="demo-chat-bubble" :class="{ 'is-current-hit': isCurrent(index) }">
              <span class="demo-ai-index">#{{ index }} </span>
              <!--
                高亮直接跟着 keyword 走：响应式框架下不需要手动清渲染池，
                关键词变了这一段会自己重新算
              -->
              <!-- Vue 2 的 <template v-for> 不能带 key，只能落在内部元素上 -->
              <template v-for="(part, i) in splitByKeyword(itemData.text)">
                <mark
                  v-if="part.hit"
                  :key="`hit-${i}`"
                  class="demo-hit"
                  :class="{ 'is-current': isCurrent(index) }"
                >{{ part.text }}</mark>
                <span v-else :key="`text-${i}`">{{ part.text }}</span>
              </template>
            </div>
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VirtList } from '@virt-list/vue2';
import { generateAiPage, type AiMessage } from '../../../../_shared/aiData';

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
 */
const hits = computed(() => {
  const kw = keyword.value;
  if (!kw) return [] as number[];
  return list.value.reduce<number[]>((acc, item, i) => {
    if (item.text.includes(kw)) acc.push(i);
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

/** 把文本按关键词切成命中/非命中的片段，供模板渲染 */
function splitByKeyword(text: string) {
  const kw = keyword.value;
  if (!kw) return [{ text, hit: false }];

  const parts: { text: string; hit: boolean }[] = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(kw, from);
    if (at === -1) break;
    if (at > from) parts.push({ text: text.slice(from, at), hit: false });
    parts.push({ text: kw, hit: true });
    from = at + kw.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), hit: false });
  return parts;
}

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
