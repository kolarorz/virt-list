<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        ref="vlRef"
        :list="list"
        item-key="id"
        :estimated-size="80"
        initial-position="bottom"
        sticky-bottom
        :has-more-bottom="false"
        :load-more="onLoadMore"
        @scroll="onScroll"
        @load-state-change="onLoadStateChange"
        @update="onUpdate"
      >
        <template #header="{ loadState }">
          <div class="demo-loading-bar">
            {{ loadState.loadingTop ? '加载历史消息...' : loadState.hasMoreTop ? '' : '没有更早的对话了' }}
          </div>
        </template>
        <template #default="{ itemData }">
          <div class="demo-chat-message demo-ai-row" :class="{ 'is-user': itemData.role === 'user' }">
            <div class="demo-chat-bubble">
              <span>{{ itemData.text }}</span>
              <span v-if="itemData.streaming" class="demo-ai-caret" />
            </div>
          </div>
        </template>
      </VirtList>
    </div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" :disabled="streaming" @click="ask">
        提问
      </button>
      <button type="button" class="virt-list-btn" :disabled="!streaming" @click="stopStream">停止生成</button>
      <button type="button" class="virt-list-btn" :disabled="atBottom" @click="jumpToBottom">
        {{ pendingNew > 0 ? `回到底部（${pendingNew} 条新消息）` : '回到底部' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { VirtList } from '@virt-list/vue2';
import type { LoadDirection, LoadState } from '@virt-list/vue2';
import {
  createAiMessage,
  fetchAiPage,
  generateAiPage,
  randomAsk,
  sliceIntoChunks,
  STREAM_ANSWER,
  type AiMessage,
} from '../../../../_shared/aiData';
import { formatAiStats } from '../../../../_shared/demoStats';

const PAGE_SIZE = 20;
const TICK = 45;

const vlRef = ref<typeof VirtList | null>(null);
const page = ref(4);
const list = ref<AiMessage[]>(generateAiPage(page.value, PAGE_SIZE));
const loadState = ref<LoadState | null>(null);
const listState = ref<any>(null);
/** 视口是否贴底——决定「回到底部」按钮要不要亮 */
const atBottom = ref(true);
const streaming = ref(false);

let timer: number | null = null;
/** 正在生成的那条消息的 id */
let streamingId: number | null = null;

const pendingNew = computed(() => loadState.value?.pendingNew ?? 0);
const statsText = computed(() =>
  formatAiStats({
    total: list.value.length,
    streaming: streaming.value,
    atBottom: atBottom.value,
    state: listState.value,
    loadState: loadState.value,
  }),
);

async function onLoadMore(direction: LoadDirection) {
  if (direction !== 'top') return false;
  const older = await fetchAiPage(page.value - 1, PAGE_SIZE);
  page.value -= 1;
  list.value = older.concat(list.value);
  return page.value > 1;
}

function stopStream() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (streamingId !== null) {
    const target = list.value.find((m) => m.id === streamingId);
    if (target) target.streaming = false;
    streamingId = null;
  }
  streaming.value = false;
}

function ask() {
  if (streaming.value) return;

  const question = createAiMessage(list.value.length, 'user', randomAsk());
  const answer = createAiMessage(list.value.length + 1, 'assistant', '', true);
  list.value = [...list.value, question, answer];
  streamingId = answer.id;
  streaming.value = true;

  const chunks = sliceIntoChunks(STREAM_ANSWER);
  let i = 0;
  timer = window.setInterval(() => {
    if (i >= chunks.length) {
      stopStream();
      return;
    }
    /**
     * 关键：改的必须是 list.value 里的那个**响应式对象**，不是 ask 作用域里的
     * answer 原始对象——后者不经过 Proxy，改了不会触发更新。
     *
     * 流式项恒在末尾，所以这里 O(1) 取到它；一次只改一个属性，
     * Vue 只会更新那一个文本节点，列表结构与其他项的 DOM 一概不动。
     */
    const target = list.value[list.value.length - 1];
    if (target && target.id === streamingId) target.text += chunks[i];
    i += 1;
  }, TICK);
}

function jumpToBottom() {
  vlRef.value?.scrollToBottom();
}

function onScroll(e: { atEnd: boolean }) {
  atBottom.value = e.atEnd;
}

function onLoadStateChange(state: LoadState) {
  loadState.value = state;
}

function onUpdate(_list: AiMessage[], state: any) {
  listState.value = state;
}

onBeforeUnmount(stopStream);
</script>
