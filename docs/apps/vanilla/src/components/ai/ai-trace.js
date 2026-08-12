import { VirtList } from '@virt-list/vanilla';
import {
  createTraceLine,
  generateTraceLines,
  KIND_LABEL,
  STATUS_ICON,
} from '../../../../_shared/traceData';
import { activeSection, buildOutline } from '../../../../_shared/outline';
import { formatMs, toolStatusLabel } from '../../../../_shared/agentBlocks';
import { renderOutput } from './parts/agent-message';

/** 每一拍追加的行数与间隔，模拟 Agent 持续输出 */
const TICK = 120;
const LINES_PER_TICK = 3;
/** 「灌入一万行」按钮的量 */
const BURST = 10000;

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container demo-trace" id="listContainer"></div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" id="runBtn">开始执行</button>
      <button type="button" class="virt-list-btn" id="burstBtn">灌入 1 万行</button>
      <button type="button" class="virt-list-btn" id="expandBtn">展开全部工具调用</button>
      <button type="button" class="virt-list-btn" id="clearBtn">清空</button>
      <button type="button" class="virt-list-btn" id="jumpBtn">回到底部</button>
    </div>
  </div>
`;

export function bootstrapAiTrace(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const runBtn = root.querySelector('#runBtn');
  const burstBtn = root.querySelector('#burstBtn');
  const expandBtn = root.querySelector('#expandBtn');
  const clearBtn = root.querySelector('#clearBtn');
  const jumpBtn = root.querySelector('#jumpBtn');

  let list = generateTraceLines(60);
  let seq = list.length;
  let timer = null;
  let atBottom = true;
  let listState = null;
  /** 上一拍的追加耗时，用来体现高频追加的开销 */
  let lastAppendMs = 0;
  /** 阶段划分，只在 list 变化时重算；滚动时只做一次 O(段数) 的查找 */
  let sections = buildOutline(list);

  let virtList;

  function refreshUI() {
    statsEl.textContent = [
      `行数: ${list.length}`,
      timer !== null ? '执行中' : '已停止',
      atBottom ? '跟随中' : '已脱离跟随',
      `渲染区间: ${listState?.renderBegin ?? '-'} - ${listState?.renderEnd ?? '-'}`,
      `上次追加: ${lastAppendMs.toFixed(1)}ms`,
    ].join(' | ');

    runBtn.textContent = timer !== null ? '暂停执行' : '开始执行';
    jumpBtn.disabled = atBottom;
    paintStage();
  }

  /**
   * 追加若干行。
   *
   * 一次 setList 提交一批，而不是每行一次：日志的到达是突发的，逐行提交会把
   * 开销全花在重复的区间计算上。贴底跟随只在**原本贴底**时才生效，
   * 所以用户往上翻看某段历史时，下面刷得再快也不会把视口拽走。
   */
  function append(count) {
    // 上一批末尾那行还标着「执行中」，先落终态并就地重画那一行
    const prev = list[list.length - 1];
    if (prev?.status === 'running') {
      prev.status = 'ok';
      virtList.refreshItems([prev.id]);
    }

    const batch = Array.from({ length: count }, () => createTraceLine(seq++));
    // 执行中的话，末尾这行还没跑完，标成「执行中」
    const last = batch[batch.length - 1];
    if (timer !== null && last) last.status = 'running';

    const started = performance.now();
    list = list.concat(batch);
    virtList.setList(list);
    lastAppendMs = performance.now() - started;
    sections = buildOutline(list);
    refreshUI();
  }

  function toggleRun() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
      const last = list[list.length - 1];
      if (last?.status === 'running') {
        last.status = 'ok';
        virtList.refreshItems([last.id]);
      }
    } else {
      timer = setInterval(() => append(LINES_PER_TICK), TICK);
    }
    refreshUI();
  }

  /** 就地切换某一行的详情，不动列表结构 */
  function toggleDetail(item, rowEl) {
    item.expanded = !item.expanded;
    const detailEl = rowEl.querySelector('.demo-trace-output');
    const caretEl = rowEl.querySelector('.demo-trace-caret');
    if (detailEl) detailEl.hidden = !item.expanded;
    if (caretEl) caretEl.textContent = item.expanded ? '▾' : '▸';
    // 高度变了，但不需要通知组件：ResizeObserver 会量到，
    // 视口位置由待维持目标自动修正——展开视口上方的行不会把内容顶走
  }

  /** 把当前阶段画到 sticky 头上：滚到哪一段就显示那一段的标题 */
  function paintStage() {
    const el = stageEl;
    if (!el) return;

    const at = activeSection(sections, listState?.inViewBegin ?? 0);
    const section = sections[at];
    el.innerHTML = '';

    const index = document.createElement('span');
    index.className = 'demo-trace-stage-index';
    index.textContent = `阶段 ${sections.length === 0 ? 0 : at + 1}/${sections.length}`;
    el.appendChild(index);

    const title = document.createElement('span');
    title.className = 'demo-trace-stage-title';
    title.textContent = section?.title ?? '等待执行';
    el.appendChild(title);

    if (section && section.errors > 0) {
      const errors = document.createElement('span');
      errors.className = 'demo-trace-stage-errors';
      errors.textContent = `${section.errors} 个错误`;
      el.appendChild(errors);
    }
  }

  let stageEl = null;

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 26,
      initialPosition: 'bottom',
      /** 日志视图的 tail follow 就是这一个配置 */
      stickyBottom: true,
      hasMoreTop: false,
      hasMoreBottom: false,
      /** 让日志可以整段复制，中间未渲染的行由数据补齐 */
      copyText: (item) =>
        `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}` +
        (item.ms > 0 ? `  (${toolStatusLabel(item.status)} ${formatMs(item.ms)})` : ''),
      renderStickyHeader: (el) => {
        el.className = 'demo-trace-stage';
        stageEl = el;
        paintStage();
      },
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = `demo-trace-line kind-${item.kind}`;

        const head = document.createElement('div');
        head.className = 'demo-trace-head';

        const caret = document.createElement('span');
        caret.className = 'demo-trace-caret';
        caret.textContent = item.detail ? (item.expanded ? '▾' : '▸') : ' ';
        head.appendChild(caret);

        const seqEl = document.createElement('span');
        seqEl.className = 'demo-trace-seq';
        seqEl.textContent = String(item.seq).padStart(5, ' ');
        head.appendChild(seqEl);

        const status = document.createElement('span');
        status.className = `demo-trace-status is-${item.status}`;
        status.textContent = STATUS_ICON[item.status];
        head.appendChild(status);

        const badge = document.createElement('span');
        badge.className = 'demo-trace-badge';
        badge.textContent = KIND_LABEL[item.kind];
        head.appendChild(badge);

        const text = document.createElement('span');
        text.className = 'demo-trace-text';
        text.textContent = item.text;
        head.appendChild(text);

        if (item.ms > 0) {
          const ms = document.createElement('span');
          ms.className = 'demo-trace-ms';
          ms.textContent = formatMs(item.ms);
          head.appendChild(ms);
        }

        row.appendChild(head);

        if (item.detail) {
          head.classList.add('is-clickable');
          head.addEventListener('click', () => toggleDetail(item, row));

          // 展开后是终端回显或一段 diff，和消息里的工具卡走同一个渲染函数
          const output = document.createElement('div');
          output.className = 'demo-trace-output';
          output.appendChild(renderOutput(item.detail, item.outputKind));
          // 展开状态存在数据里，所以行被回收再重建时不会丢
          output.hidden = !item.expanded;
          row.appendChild(output);
        }

        return row;
      },
    },
    {
      scroll: (e) => {
        atBottom = e.atEnd;
        refreshUI();
      },
      update: (_, state) => {
        listState = state;
        refreshUI();
      },
    },
  );

  runBtn.addEventListener('click', toggleRun);
  burstBtn.addEventListener('click', () => append(BURST));
  clearBtn.addEventListener('click', () => {
    list = [];
    seq = 0;
    sections = buildOutline(list);
    virtList.reset();
    virtList.setList(list);
    refreshUI();
  });
  jumpBtn.addEventListener('click', () => virtList.scrollToBottom());

  /**
   * 一次展开全部工具调用：几百行同时从一行变成九行。
   *
   * 这种整体性的高度剧变是日志视图最容易露白的时刻，也是最值得看的一眼。
   *
   * 改的是全部行，所以整屏都要重建——`refreshItems()` 不传参数即此意
   * （单独折叠一行走的是就地改 DOM，见 toggleDetail）。
   */
  expandBtn.addEventListener('click', () => {
    const expand = !list.some((item) => item.expanded);
    for (const item of list) {
      if (item.detail) item.expanded = expand;
    }
    virtList.refreshItems();
    expandBtn.textContent = expand ? '收起全部工具调用' : '展开全部工具调用';
  });

  refreshUI();

  return () => {
    if (timer !== null) clearInterval(timer);
    virtList.destroy();
    root.innerHTML = '';
  };
}
