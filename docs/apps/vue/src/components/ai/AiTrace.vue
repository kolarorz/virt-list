<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container demo-trace">
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
        @scroll="onScroll"
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <div class="demo-trace-line" :class="`kind-${itemData.kind}`">
            <div
              class="demo-trace-head"
              :class="{ 'is-clickable': !!itemData.detail }"
              @click="itemData.detail && toggle(itemData)"
            >
              <span class="demo-trace-caret">{{ itemData.detail ? (itemData.expanded ? '▾' : '▸') : ' ' }}</span>
              <span class="demo-trace-seq">{{ String(itemData.seq).padStart(5, ' ') }}</span>
              <span class="demo-trace-badge">{{ kindLabel(itemData.kind) }}</span>
              <span class="demo-trace-text">{{ itemData.text }}</span>
            </div>
            <pre v-if="itemData.detail && itemData.expanded" class="demo-trace-detail">{{ itemData.detail }}</pre>
          </div>
        </template>
      </VirtList>
    </div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="toggleRun">
        {{ running ? '暂停执行' : '开始执行' }}
      </button>
      <button type="button" class="virt-list-btn" @click="append(BURST)">灌入 1 万行</button>
      <button type="button" class="virt-list-btn" @click="toggleAll">
        {{ anyExpanded ? '收起全部工具调用' : '展开全部工具调用' }}
      </button>
      <button type="button" class="virt-list-btn" @click="clear">清空</button>
      <button type="button" class="virt-list-btn" :disabled="atBottom" @click="jumpToBottom">回到底部</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import {
  createTraceLine,
  generateTraceLines,
  KIND_LABEL,
  type TraceKind,
  type TraceLine,
} from '../../../../_shared/traceData';

/** 插槽参数是无类型的，收窄一次再查表 */
const kindLabel = (kind: string) => KIND_LABEL[kind as TraceKind] ?? kind;

const TICK = 120;
const LINES_PER_TICK = 3;
const BURST = 10000;

const vlRef = ref<typeof VirtList | null>(null);
const list = ref<TraceLine[]>(generateTraceLines(60));
const running = ref(false);
const atBottom = ref(true);
const listState = ref<any>(null);
const lastAppendMs = ref(0);

let seq = list.value.length;
let timer: number | null = null;

const anyExpanded = computed(() => list.value.some((line) => line.expanded));

const statsText = computed(() =>
  [
    `行数: ${list.value.length}`,
    running.value ? '执行中' : '已停止',
    atBottom.value ? '跟随中' : '已脱离跟随',
    `渲染区间: ${listState.value?.renderBegin ?? '-'} - ${listState.value?.renderEnd ?? '-'}`,
    `上次追加: ${lastAppendMs.value.toFixed(1)}ms`,
  ].join(' | '),
);

const copyText = (item: TraceLine) =>
  `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}`;

/**
 * 一次提交一批，而不是每行一次。
 *
 * 日志的到达是突发的，逐行赋值会把开销全花在重复的区间计算上，
 * 而这些计算在同一帧内的结果是等价的。
 */
function append(count: number) {
  const batch = Array.from({ length: count }, () => createTraceLine(seq++));
  const started = performance.now();
  list.value = list.value.concat(batch);
  lastAppendMs.value = performance.now() - started;
}

function toggleRun() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
    running.value = false;
  } else {
    timer = window.setInterval(() => append(LINES_PER_TICK), TICK);
    running.value = true;
  }
}

/**
 * 展开/收起一行的详情。
 *
 * 改的是响应式对象的属性，模板会只更新这一行；高度变化不必通知组件——
 * ResizeObserver 会量到，视口位置由待维持目标自动修正。
 */
function toggle(item: TraceLine) {
  item.expanded = !item.expanded;
}

/** 一次展开全部：几百行同时从一行变成九行，是最容易露白的时刻 */
function toggleAll() {
  const expand = !anyExpanded.value;
  for (const line of list.value) {
    if (line.detail) line.expanded = expand;
  }
}

function clear() {
  seq = 0;
  vlRef.value?.reset();
  list.value = [];
}

function jumpToBottom() {
  vlRef.value?.scrollToBottom();
}

function onScroll(e: { atEnd: boolean }) {
  atBottom.value = e.atEnd;
}

function onUpdate(_list: TraceLine[], state: any) {
  listState.value = state;
}

onBeforeUnmount(() => {
  if (timer !== null) clearInterval(timer);
});
</script>
