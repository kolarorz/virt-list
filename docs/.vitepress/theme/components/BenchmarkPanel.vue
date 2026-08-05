<script setup lang="ts">
/**
 * 首页性能实测面板。
 *
 * 所有数字都在访客自己的设备上现场跑出来，不是预先写死的成绩：
 * 左侧是一个真实工作的虚拟列表，右侧是对它逐个 API 的计时结果。
 *
 * 计时口径（表格下方也向访客说明）：
 * - 只统计调用的**同步**耗时，即 JS 计算 + DOM 结构更新；
 *   浏览器随后的样式计算、布局、绘制不在其中。
 * - 浏览器会把 performance.now() 的精度限制到 0.1ms，单次计时测不出这个
 *   量级的操作，因此一律「连续执行 N 次、计总时间再除以 N」。
 * - 每次操作的目标都不同（跳向不同位置、来回跨越全程），既免去了复位开销
 *   混入计时，也更接近真实使用。
 * - 不测 scrollToTop / scrollToBottom：它们的实质工作是异步的渐进校准
 *   （rAF + ResizeObserver 反复逼近目标），同步耗时接近零，摆上来只会误导。
 * - 「生成测试数据」是纯 JS 造数组的耗时，不属于本库开销，列出来只为让
 *   访客明白 setList 的数字里不包含它。
 */
import { onBeforeUnmount, ref } from 'vue';
import { VirtList } from '@virt-list/vanilla';

interface Row {
  id: number;
  text: string;
}

interface Result {
  name: string;
  ms: number;
  note: string;
  /** 该操作的时间复杂度，随行展示 */
  complexity?: string;
  /** 核心指标，在表格里高亮 */
  primary?: boolean;
}

/** 60fps 的单帧预算 */
const FRAME_BUDGET = 16.7;

/** 长短不一的文本，用于在不定高模式下自然产生不同行高 */
const TEXTS = [
  '短文本行。',
  '这是一行中等长度的列表项内容，用于产生不同的行高。',
  '较长的一行：虚拟滚动只渲染可视区域与缓冲区内的节点，因此列表长度不影响 DOM 规模，滚动开销也不随数据量增长。',
  '两行左右的内容，配合不定高测量与偏移修正一起工作。',
];

const SIZES = [10_000, 100_000, 300_000];

const size = ref(100_000);
const fixedMode = ref(false);
const running = ref(false);
const phase = ref('');
const results = ref<Result[]>([]);
const domCount = ref(0);
const hasRun = ref(false);

const hostRef = ref<HTMLElement | null>(null);
let vList: VirtList<Row> | null = null;

const ROW_HEIGHT = 44;

function destroyList(): void {
  vList?.destroy();
  vList = null;
}

onBeforeUnmount(destroyList);

/**
 * 连续执行 times 次，返回单次平均耗时。
 *
 * 之所以不用「单次计时取中位数」：浏览器把 performance.now() 的精度限制在
 * 0.1ms，而这里多数操作远快于此，单次计时只会得到 0 或 0.1 这样的台阶值。
 * 累计计时再平摊，才能测出真实量级。
 *
 * fn 收到序号，用于让每次操作的目标都不一样——这样无需在计时区间外复位状态，
 * 也避免第二次调用因为「已经在目标位置」而被提前返回优化掉。
 */
function measureLoop(times: number, fn: (i: number) => void): number {
  const start = performance.now();
  for (let i = 0; i < times; i += 1) fn(i);
  return (performance.now() - start) / times;
}

function makeData(n: number): Row[] {
  const data: Row[] = new Array(n);
  for (let i = 0; i < n; i += 1) {
    data[i] = { id: i, text: TEXTS[i % TEXTS.length]! };
  }
  return data;
}

/** 让出主线程，好让进度文案能真正渲染出来 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function run(): Promise<void> {
  if (running.value || !hostRef.value) return;
  running.value = true;
  results.value = [];

  const total = size.value;
  const isFixed = fixedMode.value;
  const out: Result[] = [];

  try {
    phase.value = '生成测试数据…';
    await nextFrame();

    const genStart = performance.now();
    const data = makeData(total);
    const genMs = performance.now() - genStart;
    out.push({
      name: '生成测试数据',
      ms: genMs,
      note: `${total.toLocaleString()} 条对象（纯 JS，非本库开销）`,
    });

    phase.value = '挂载列表…';
    await nextFrame();

    destroyList();
    hostRef.value.innerHTML = '';

    const mountStart = performance.now();
    vList = new VirtList<Row>(
      hostRef.value,
      {
        list: data,
        itemKey: 'id',
        itemPreSize: ROW_HEIGHT,
        fixed: isFixed,
        buffer: 2,
        renderItem: (item, index, el) => {
          el.className = 'bench-row';
          el.textContent = `#${index.toLocaleString()}　${item.text}`;
        },
      },
    );
    out.push({
      name: '首次挂载并渲染',
      ms: performance.now() - mountStart,
      note: '构建索引 + 渲染首屏',
      complexity: 'O(视口)',
    });

    const list = vList;
    const clientEl = list.clientEl;

    phase.value = '测量滚动…';
    await nextFrame();

    // 稳态滚动：连续处理 scroll 事件，这是决定滚动流畅度的实际开销
    list.scrollToOffset(0);
    const scrollStepMs = measureLoop(200, () => {
      clientEl.scrollTop += 240;
      clientEl.dispatchEvent(new Event('scroll'));
    });
    out.push({
      name: '处理一次滚动事件',
      ms: scrollStepMs,
      note: '连续滚动 200 次；这一项直接决定滚动是否流畅',
      complexity: 'O(1)',
      primary: true,
    });

    phase.value = '测量跳转定位…';
    await nextFrame();

    // 每次跳到不同位置，既免去复位、又避免「已在目标位置」被提前返回
    const lastIndex = Math.max(0, total - 2);
    const jumpMs = measureLoop(100, (i) => {
      list.scrollToIndex(Math.floor((lastIndex * ((i * 37) % 100)) / 100));
    });
    out.push({
      name: 'scrollToIndex(任意位置)',
      ms: jumpMs,
      note: '连续跳转 100 次，每次目标不同',
      complexity: isFixed ? 'O(1)' : 'O(√n)',
    });

    // 来回跨越整个列表：最坏情况下的区间重算
    const totalSize = list.core.getTotalSize();
    const spanMs = measureLoop(60, (i) => {
      clientEl.scrollTop = i % 2 ? totalSize : 0;
      clientEl.dispatchEvent(new Event('scroll'));
    });
    out.push({
      name: '首尾之间整程跨越',
      ms: spanMs,
      note: '拖动滚动条从一端直达另一端，区间全部重算',
      complexity: isFixed ? 'O(1)' : 'O(√n)',
    });

    phase.value = '测量数据替换…';
    await nextFrame();

    // 交替两个数组，避免「引用没变」让实现走捷径
    const data2 = data.slice();
    const replaceMs = measureLoop(10, (i) => {
      list.setList(i % 2 ? data2 : data);
    });
    out.push({
      name: `setList(${total.toLocaleString()})`,
      ms: replaceMs,
      note: '整体替换数据源，重算总尺寸与渲染区间',
      complexity: isFixed ? 'O(1)' : 'O(n)',
    });

    list.scrollToOffset(0);
    domCount.value = clientEl.querySelectorAll('.bench-row').length;
    results.value = out;
    hasRun.value = true;
  } finally {
    running.value = false;
    phase.value = '';
  }
}

function fmt(ms: number): string {
  if (ms >= 100) return ms.toFixed(0);
  if (ms >= 10) return ms.toFixed(1);
  if (ms >= 1) return ms.toFixed(2);
  return ms.toFixed(3);
}

/** 单帧预算以内标绿：这类操作不会让 60fps 掉帧 */
function isWithinFrame(r: Result): boolean {
  return r.name !== '生成测试数据' && r.ms < FRAME_BUDGET;
}

/** 该项占单帧预算的比例，用于画条 */
function budgetRatio(r: Result): number {
  return Math.min(1, r.ms / FRAME_BUDGET);
}

/** 占比文案：低于千分之一就不必给出具体百分数了 */
function budgetText(r: Result): string {
  const pct = (r.ms / FRAME_BUDGET) * 100;
  if (pct >= 100) return `超出单帧 ${(pct / 100).toFixed(1)} 倍`;
  if (pct >= 1) return `占单帧 ${pct.toFixed(0)}%`;
  if (pct >= 0.1) return `占单帧 ${pct.toFixed(1)}%`;
  return '占单帧不足 0.1%';
}
</script>

<template>
  <section class="bench">
    <h2 class="bench-title">在你的设备上实测</h2>
    <p class="bench-lead">
      下面的数字不是预先写死的成绩，而是点击按钮后在你当前的浏览器里现场跑出来的。
      左侧是一个真实工作的虚拟列表，右侧是对它逐个 API 的计时结果。
    </p>

    <div class="bench-controls">
      <div class="bench-field">
        <span class="bench-label">数据量</span>
        <div class="bench-segmented">
          <button
            v-for="n in SIZES"
            :key="n"
            type="button"
            :class="['bench-seg', { 'is-active': size === n }]"
            :disabled="running"
            @click="size = n"
          >
            {{ n.toLocaleString() }}
          </button>
        </div>
      </div>

      <div class="bench-field">
        <span class="bench-label">行高</span>
        <div class="bench-segmented">
          <button
            type="button"
            :class="['bench-seg', { 'is-active': !fixedMode }]"
            :disabled="running"
            @click="fixedMode = false"
          >
            不定高
          </button>
          <button
            type="button"
            :class="['bench-seg', { 'is-active': fixedMode }]"
            :disabled="running"
            @click="fixedMode = true"
          >
            固定高
          </button>
        </div>
      </div>

      <button
        type="button"
        class="bench-run"
        :disabled="running"
        @click="run"
      >
        {{ running ? phase || '测试中…' : hasRun ? '重新测试' : '开始测试' }}
      </button>
    </div>

    <div class="bench-body">
      <div class="bench-preview">
        <div ref="hostRef" class="bench-host">
          <p v-if="!hasRun && !running" class="bench-placeholder">
            点击「开始测试」后，这里会渲染一个真实的虚拟列表
          </p>
        </div>
        <p v-if="hasRun" class="bench-domnote">
          当前列表共
          <strong>{{ size.toLocaleString() }}</strong>
          条数据，而 DOM 中只有
          <strong>{{ domCount }}</strong>
          个列表节点
        </p>
      </div>

      <div class="bench-results">
        <table v-if="results.length" class="bench-table">
          <thead>
            <tr>
              <th>操作 / 占单帧预算（16.7ms）的比例</th>
              <th class="bench-num">耗时</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in results"
              :key="r.name"
              :class="{ 'is-primary': r.primary }"
            >
              <td>
                <div class="bench-op">
                  {{ r.name }}
                  <code v-if="r.complexity" class="bench-cx">{{ r.complexity }}</code>
                  <span v-if="r.primary" class="bench-badge">核心指标</span>
                </div>
                <div class="bench-note">{{ r.note }}</div>
                <div v-if="r.complexity" class="bench-bar">
                  <div
                    :class="['bench-bar-fill', { 'is-fast': isWithinFrame(r) }]"
                    :style="{ width: `${Math.max(budgetRatio(r) * 100, 0.5)}%` }"
                  />
                </div>
                <div v-if="r.complexity" class="bench-budget">
                  {{ budgetText(r) }}
                </div>
              </td>
              <td class="bench-num">
                <span :class="['bench-ms', { 'is-fast': isWithinFrame(r) }]">
                  {{ fmt(r.ms) }}<i>ms</i>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="bench-empty">尚未运行测试</p>

        <details class="bench-detail">
          <summary>计时口径与取舍（值得一读）</summary>
          <p class="bench-method">
            只统计调用的<strong>同步</strong>耗时（JS 计算 + DOM 结构更新），
            浏览器随后的样式计算、布局与绘制不计入。由于
            <code>performance.now()</code> 的精度被限制在 0.1ms，每项都是
            <strong>连续执行多次、计总时间再平摊</strong>，且每次的目标都不同。
            绿色表示低于单帧预算 16.7ms，即不会导致 60fps 掉帧。数字随设备与浏览器而变化。
          </p>
          <p class="bench-method">
            未列入 <code>scrollToTop()</code> / <code>scrollToBottom()</code>：
            不定高列表里它们的实质工作是异步的渐进校准（反复逼近目标直到尺寸稳定），
            同步耗时接近于零，摆上来只会让人误解。
          </p>
          <p class="bench-method">
            切换「固定高 / 不定高」可以看出两种模式的固有区别：固定高时任意项的位置
            由乘除法直接算出，与数据量无关；不定高时每项高度只能实测，位置查询依靠
            分块索引（成本约 √n 而非 n）。唯一仍随数据量线性增长的是
            <code>setList</code>——整体替换数据源必须重新累加一遍总尺寸，
            这一趟省不掉。<strong>滚动本身</strong>两种模式都在 0.1ms 量级，
            因为稳态滚动每帧只跨越几项，是增量推进的。
          </p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bench {
  max-width: 1152px;
  margin: 16px auto 64px;
  padding: 0 24px;
}

.bench-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.bench-lead {
  margin: 0 0 24px;
  max-width: 720px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.bench-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 20px;
}

.bench-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bench-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
}

.bench-segmented {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
}

.bench-seg {
  padding: 5px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.bench-seg:hover:not(:disabled) {
  color: var(--vp-c-text-1);
}

.bench-seg.is-active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.bench-seg:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.bench-run {
  padding: 9px 22px;
  border: 0;
  border-radius: 8px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bench-run:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.bench-run:disabled {
  cursor: progress;
  opacity: 0.7;
}

.bench-body {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 5fr);
  gap: 24px;
  align-items: start;
}

.bench-preview {
  min-width: 0;
}

.bench-host {
  height: 560px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.bench-placeholder {
  display: flex;
  height: 100%;
  margin: 0;
  padding: 0 32px;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 13px;
  line-height: 1.6;
}

.bench-domnote {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.bench-domnote strong {
  color: var(--vp-c-brand-1);
  font-variant-numeric: tabular-nums;
}

.bench-results {
  min-width: 0;
}

.bench-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.bench-table th {
  padding: 0 0 8px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  border-bottom: 1px solid var(--vp-c-divider);
}

.bench-table td {
  padding: 12px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  vertical-align: top;
}

.bench-num {
  text-align: right;
  white-space: nowrap;
}

.bench-op {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.bench-table tr.is-primary .bench-op {
  font-weight: 600;
}

/* 不用等宽字体：O(1) 在等宽下会被读成 0(1) */
.bench-cx {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
  font-size: 11px;
  font-weight: 600;
}

/* 帧预算条：满格代表 16.7ms，绝大多数操作只占其中极窄的一段 */
.bench-bar {
  position: relative;
  height: 4px;
  margin-top: 8px;
  border-radius: 999px;
  background: var(--vp-c-default-soft);
  overflow: hidden;
}

.bench-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--vp-c-text-3);
  transition: width 0.4s ease-out;
}

.bench-bar-fill.is-fast {
  background: var(--vp-c-green-1, #10b981);
}

.bench-budget {
  margin-top: 4px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
}

.bench-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-base);
  font-size: 11px;
  font-weight: 600;
  vertical-align: 1px;
}

.bench-note {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}

.bench-ms {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
}

.bench-ms.is-fast {
  color: var(--vp-c-green-1, #10b981);
}

.bench-ms i {
  margin-left: 2px;
  font-size: 11px;
  font-style: normal;
  font-weight: 500;
  opacity: 0.6;
}

.bench-empty {
  padding: 32px 0;
  margin: 0;
  color: var(--vp-c-text-3);
  font-size: 13px;
}

.bench-detail {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--vp-c-divider);
}

.bench-detail > summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  user-select: none;
}

.bench-detail > summary:hover {
  color: var(--vp-c-brand-1);
}

.bench-method {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--vp-c-text-3);
}

.bench-method strong {
  color: var(--vp-c-text-2);
}

@media (max-width: 860px) {
  .bench-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .bench-host {
    height: 320px;
  }
}
</style>

<style>
/* 列表项由 renderItem 直接创建，不在 scoped 作用域内 */
.bench-host .bench-row {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  box-sizing: border-box;
}
</style>
