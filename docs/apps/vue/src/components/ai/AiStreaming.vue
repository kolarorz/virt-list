<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <AgentShell
      :live="runs.length > 0"
      :model="MODEL_NAME"
      :phase="phase"
      :steps="steps"
      :quick-asks="QUICK_ASKS"
      @send="ask"
      @stop="stopAll"
    >
      <div class="demo-list-container">
        <VirtList
          ref="vlRef"
          :list="list"
          item-key="id"
          :estimated-size="200"
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
            <AgentMessage
              :message="itemData"
              :streaming="isStreaming(itemData.id)"
              @retry="retry"
            />
          </template>
        </VirtList>
      </div>

      <template #toolbar>
        <button type="button" class="virt-list-btn" :disabled="atBottom" @click="jumpToBottom">
          {{ pendingNew > 0 ? `回到底部（${pendingNew} 条新消息）` : '回到底部' }}
        </button>
      </template>
    </AgentShell>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import type { LoadDirection, LoadState } from '@virt-list/vue';
import {
  createAiMessage,
  fetchAiPage,
  generateAiPage,
  MODEL_NAME,
  QUICK_ASKS,
  sliceIntoChunks,
  type AiMessage,
} from '../../../../_shared/aiData';
import {
  appendToBlock,
  blocksToPlainText,
  buildAnswerScript,
  settleBlock,
  stepHoldFrames,
  stepText,
  stepToBlock,
  type StreamStep,
} from '../../../../_shared/agentBlocks';
import { formatAiStats } from '../../../../_shared/demoStats';
import AgentMessage from './parts/AgentMessage.vue';
import AgentShell from './parts/AgentShell.vue';

const PAGE_SIZE = 20;
const TICK = 35;

/** 一次回答的演出脚本：思考 → 工具 → 正文 → 代码 → 工具 → 正文 → 图表 → 来源 */
const SCRIPT = buildAnswerScript();

const PHASE_TEXT: Record<StreamStep['type'], string> = {
  thinking: '正在思考',
  tool: '正在调用工具',
  text: '正在生成回答',
  code: '正在写代码',
  chart: '正在算数据',
  sources: '正在整理来源',
};

/**
 * 一条正在生成的回答。
 *
 * 注意它**直接持有那条消息的响应式引用**，而不是记一个 id。
 * 允许多条同时生成之后，「流式项在末尾」这个前提就没了；若每帧用 id 去 list 里
 * 找，开销是 O(历史条数 × 并发数)，几千条历史下就能看出来。持有引用是 O(1)，
 * 而且与这条消息此刻排在第几位无关。
 */
interface StreamRun {
  msg: AiMessage;
  step: number;
  chunk: number;
  chunks: string[];
  hold: number;
  opened: boolean;
  startedAt: number;
}

const vlRef = ref<typeof VirtList | null>(null);
const page = ref(4);
const list = ref<AiMessage[]>(generateAiPage(page.value, PAGE_SIZE));
const loadState = ref<LoadState | null>(null);
const listState = ref<any>(null);
/** 视口是否贴底——决定「回到底部」按钮要不要亮 */
const atBottom = ref(true);
/** 正在生成的若干条回答，空数组表示空闲 */
const runs = ref<StreamRun[]>([]);
/** 当前渲染区间里的 DOM 节点数，节流统计 */
const nodes = ref(0);
let lastCountAt = 0;

let timer: number | null = null;

const pendingNew = computed(() => loadState.value?.pendingNew ?? 0);

/** 顶部状态条按跑得最靠前的那条显示进度 */
const leadRun = computed(() =>
  runs.value.reduce<StreamRun | null>((a, b) => (a && a.step >= b.step ? a : b), null),
);
const steps = computed(() => ({ done: leadRun.value?.step ?? 0, total: SCRIPT.length }));
const phase = computed(() => {
  if (runs.value.length === 0) return '空闲';
  if (runs.value.length > 1) return `${runs.value.length} 条回答同时生成中`;
  const step = SCRIPT[leadRun.value?.step ?? 0];
  return step ? PHASE_TEXT[step.type] : '收尾';
});

const statsText = computed(() =>
  formatAiStats({
    total: list.value.length,
    streaming: runs.value.length > 0,
    atBottom: atBottom.value,
    step: runs.value.length > 0 ? steps.value : undefined,
    nodes: nodes.value,
    state: listState.value,
    loadState: loadState.value,
  }),
);

const isStreaming = (id: number) => runs.value.some((r) => r.msg.id === id);

async function onLoadMore(direction: LoadDirection) {
  if (direction !== 'top') return false;
  const older = await fetchAiPage(page.value - 1, PAGE_SIZE);
  page.value -= 1;
  list.value = older.concat(list.value);
  return page.value > 1;
}

/**
 * 推进一条回答一帧。
 *
 * 一次回答里有两种完全不同的更新，这个函数把它们分开：
 *
 * - **插入一个块**（思考、工具卡、代码块、图表、来源）——一次高度跳变，结构变了；
 * - **往块里追加一片文本**——只改一个属性，高度连续增长，DOM 结构一动不动。
 *
 * 前者故意单独占一帧，好让读者看清跳变发生的那一刻跟随是否稳定。
 */
function advance(run: StreamRun): boolean {
  const step = SCRIPT[run.step];
  if (!step) return false;

  if (!run.opened) {
    run.msg.blocks.push(stepToBlock(step));
    run.chunks = sliceIntoChunks(stepText(step));
    run.hold = stepHoldFrames(step);
    run.chunk = 0;
    run.opened = true;
    return true;
  }

  const block = run.msg.blocks[run.msg.blocks.length - 1]!;

  if (run.chunk < run.chunks.length) {
    /**
     * 关键：改的必须是列表里的那个**响应式对象**。
     * run.msg 是从 list.value 里取出来的 Proxy，改它才会触发更新；
     * 造数据时的原始对象不经过 Proxy，改了界面不会变。
     */
    appendToBlock(block, run.chunks[run.chunk]!);
    run.chunk += 1;
    return true;
  }

  // 工具卡与图表多停几帧再落地，让「执行中」「正在算」这两个状态看得见
  if (run.hold > 0) {
    run.hold -= 1;
    return true;
  }

  settleBlock(block, step);
  run.step += 1;
  run.opened = false;
  return true;
}

function tick() {
  // 倒着遍历：演完的 run 要就地摘掉
  for (let i = runs.value.length - 1; i >= 0; i -= 1) {
    const run = runs.value[i]!;
    if (run.step >= SCRIPT.length) {
      finish(run);
      continue;
    }
    advance(run);
  }

  if (runs.value.length === 0 && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function startRun(msg: AiMessage) {
  runs.value.push({
    msg,
    step: 0,
    chunk: 0,
    chunks: [],
    hold: 0,
    opened: false,
    startedAt: performance.now(),
  });
  timer ??= window.setInterval(tick, TICK);
}

/** 一条回答收尾：补上统计、摘掉光标、从活跃列表里移除 */
function finish(run: StreamRun, aborted = false) {
  const msg = run.msg;
  msg.streaming = false;

  if (aborted) {
    // 中途停止时可能有一张卡还在转，落成「已取消」——既不是成功也不是失败，
    // 但绝不能留一个永远转下去的图标
    const last = msg.blocks[msg.blocks.length - 1];
    if (last?.kind === 'tool' && last.status === 'running') last.status = 'aborted';
    if (last?.kind === 'chart' && last.loading) last.loading = false;
  }

  msg.ms = Math.round(performance.now() - run.startedAt);
  // 展示用的估算值，按内容长度折算，不追求和真实分词一致
  msg.tokens = Math.round(blocksToPlainText(msg.blocks).length / 1.4);

  const at = runs.value.indexOf(run);
  if (at >= 0) runs.value.splice(at, 1);
}

function stopAll() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  for (const run of [...runs.value]) finish(run, true);
}

/**
 * 提问。
 *
 * 生成过程中再问一次不会被拦住——两条回答会同时生成，
 * 这正是真实 agent 界面的样子，也是对跟随更狠的一档：
 * 同一帧里有两项在变高，而它们未必都在视口里。
 */
function ask(question: string) {
  const base = list.value.length;
  const q = createAiMessage(base, 'user', question);
  // 回答以空消息入场，块由演出脚本一步步插进来
  const a = createAiMessage(base + 1, 'assistant', '', true);
  list.value = [...list.value, q, a];
  // 必须从 list 里取回那个响应式副本，push 之前的原始对象改了界面不会动
  const msg = list.value[list.value.length - 1]!;
  startRun(msg);
}

/**
 * 重新生成某条回答。
 *
 * 清空 blocks 会让这一项的高度从几百像素骤降到几十像素——比追加内容更极端的
 * 一种变化。贴底时视口应当立刻收回到新的内容末端，不该留一片空白。
 */
function retry(msg: AiMessage) {
  if (isStreaming(msg.id)) return;
  msg.blocks = [];
  msg.streaming = true;
  startRun(msg);
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
  countNodes();
}

/**
 * 数一下当前渲染了多少 DOM 节点。
 *
 * 富消息里一个代码块就是十几个节点，这个数字比「渲染了几项」更能说明开销。
 * 遍历 DOM 本身有成本，所以节流到半秒一次——度量不该影响被度量的东西。
 */
function countNodes() {
  const now = performance.now();
  if (now - lastCountAt < 500) return;
  lastCountAt = now;
  const el = vlRef.value?.clientEl as HTMLElement | undefined;
  nodes.value = el ? el.querySelectorAll('*').length : 0;
}

onBeforeUnmount(stopAll);
</script>
