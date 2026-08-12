<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container demo-trace">
      <VirtList
        ref="vlRef"
        :list="list"
        item-key="id"
        :estimated-size="26"
        initial-position="bottom"
        sticky-bottom
        :has-more-top="false"
        :has-more-bottom="false"
        :copy-text="copyText"
        @scroll="onScroll"
        @update="onUpdate"
      >
        <!-- 当前阶段悬浮在顶部：滚到哪一段，这里就显示那一段的标题 -->
        <template #stickyHeader>
          <div class="demo-trace-stage">
            <span class="demo-trace-stage-index">
              阶段 {{ sections.length === 0 ? 0 : current + 1 }}/{{ sections.length }}
            </span>
            <span class="demo-trace-stage-title">{{ currentSection?.title ?? '等待执行' }}</span>
            <span v-if="currentSection && currentSection.errors > 0" class="demo-trace-stage-errors">
              {{ currentSection.errors }} 个错误
            </span>
          </div>
        </template>

        <template #default="{ itemData }">
          <div class="demo-trace-line" :class="`kind-${itemData.kind}`">
            <div
              class="demo-trace-head"
              :class="{ 'is-clickable': !!itemData.detail }"
              @click="itemData.detail && toggle(itemData)"
            >
              <span class="demo-trace-caret">{{ itemData.detail ? (itemData.expanded ? '▾' : '▸') : ' ' }}</span>
              <span class="demo-trace-seq">{{ String(itemData.seq).padStart(5, ' ') }}</span>
              <span class="demo-trace-status" :class="`is-${itemData.status}`">
                {{ statusIcon(itemData.status) }}
              </span>
              <span class="demo-trace-badge">{{ kindLabel(itemData.kind) }}</span>
              <span class="demo-trace-text">{{ itemData.text }}</span>
              <span v-if="itemData.ms > 0" class="demo-trace-ms">{{ formatMs(itemData.ms) }}</span>
            </div>
            <!-- 展开后是终端回显或一段 diff，和消息里的工具卡走同一套渲染 -->
            <div v-if="itemData.detail && itemData.expanded" class="demo-trace-output">
              <AgentOutput :text="itemData.detail" :kind="itemData.outputKind" />
            </div>
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
  STATUS_ICON,
  type TraceKind,
  type TraceLine,
  type TraceStatus,
} from '../../../../_shared/traceData';
import { activeSection, buildOutline } from '../../../../_shared/outline';
import { formatMs, toolStatusLabel } from '../../../../_shared/agentBlocks';
import AgentOutput from './parts/AgentOutput.vue';

/** 插槽参数是无类型的，收窄一次再查表 */
const kindLabel = (kind: string) => KIND_LABEL[kind as TraceKind] ?? kind;
const statusIcon = (status: string) => STATUS_ICON[status as TraceStatus] ?? '';

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

/**
 * 阶段划分从数据里读出来（思考行开启一个新阶段），和语义滚动条示例用的是同一个函数。
 * 只在 list 变化时重算，滚动过程中只做一次 O(段数) 的查找。
 */
const sections = computed(() => buildOutline(list.value));
const current = computed(() => activeSection(sections.value, listState.value?.inViewBegin ?? 0));
const currentSection = computed(() => sections.value[current.value]);

const statsText = computed(() =>
  [
    `行数: ${list.value.length}`,
    running.value ? '执行中' : '已停止',
    atBottom.value ? '跟随中' : '已脱离跟随',
    `渲染区间: ${listState.value?.renderBegin ?? '-'} - ${listState.value?.renderEnd ?? '-'}`,
    `上次追加: ${lastAppendMs.value.toFixed(1)}ms`,
  ].join(' | '),
);

// TraceStatus 是 ToolStatus 的子集，可以直接查表
const copyText = (item: TraceLine) =>
  `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}` +
  (item.ms > 0 ? `  (${toolStatusLabel(item.status)} ${formatMs(item.ms)})` : '');

/**
 * 一次提交一批，而不是每行一次。
 *
 * 日志的到达是突发的，逐行赋值会把开销全花在重复的区间计算上，
 * 而这些计算在同一帧内的结果是等价的。
 */
function append(count: number) {
  // 上一批末尾那行还标着「执行中」，先落终态。
  // 注意要从 list.value 里取——那是响应式对象，改它才会触发更新
  const prev = list.value[list.value.length - 1];
  if (prev && prev.status === 'running') prev.status = 'ok';

  const batch = Array.from({ length: count }, () => createTraceLine(seq++));
  // 执行中的话，末尾这行还没跑完，标成「执行中」
  const last = batch[batch.length - 1];
  if (running.value && last) last.status = 'running';

  const started = performance.now();
  list.value = list.value.concat(batch);
  lastAppendMs.value = performance.now() - started;
}

function toggleRun() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
    running.value = false;
    const last = list.value[list.value.length - 1];
    if (last && last.status === 'running') last.status = 'ok';
  } else {
    running.value = true;
    timer = window.setInterval(() => append(LINES_PER_TICK), TICK);
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

/** 一次展开全部：几百行同时从一行变成十几行，是最容易露白的时刻 */
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
