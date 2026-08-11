import { VirtList } from '@virt-list/vanilla';
import {
  createTraceLine,
  generateTraceLines,
  KIND_LABEL,
} from '../../../../_shared/traceData';

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
  }

  /**
   * 追加若干行。
   *
   * 一次 setList 提交一批，而不是每行一次：日志的到达是突发的，逐行提交会把
   * 开销全花在重复的区间计算上。贴底跟随只在**原本贴底**时才生效，
   * 所以用户往上翻看某段历史时，下面刷得再快也不会把视口拽走。
   */
  function append(count) {
    const batch = Array.from({ length: count }, () => createTraceLine(seq++));
    const started = performance.now();
    list = list.concat(batch);
    virtList.setList(list);
    lastAppendMs = performance.now() - started;
    refreshUI();
  }

  function toggleRun() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    } else {
      timer = setInterval(() => append(LINES_PER_TICK), TICK);
    }
    refreshUI();
  }

  /** 就地切换某一行的详情，不动列表结构 */
  function toggleDetail(item, rowEl) {
    item.expanded = !item.expanded;
    const detailEl = rowEl.querySelector('.demo-trace-detail');
    const caretEl = rowEl.querySelector('.demo-trace-caret');
    if (detailEl) detailEl.hidden = !item.expanded;
    if (caretEl) caretEl.textContent = item.expanded ? '▾' : '▸';
    // 高度变了，但不需要通知组件：ResizeObserver 会量到，
    // 视口位置由待维持目标自动修正——展开视口上方的行不会把内容顶走
  }

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 24,
      initialPosition: 'bottom',
      /** 日志视图的 tail follow 就是这一个配置 */
      stickyBottom: true,
      hasMoreTop: false,
      hasMoreBottom: false,
      /** 让日志可以整段复制，中间未渲染的行由数据补齐 */
      copyText: (item) =>
        `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}`,
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

        const badge = document.createElement('span');
        badge.className = 'demo-trace-badge';
        badge.textContent = KIND_LABEL[item.kind];
        head.appendChild(badge);

        const text = document.createElement('span');
        text.className = 'demo-trace-text';
        text.textContent = item.text;
        head.appendChild(text);

        row.appendChild(head);

        if (item.detail) {
          head.classList.add('is-clickable');
          head.addEventListener('click', () => toggleDetail(item, row));

          const detail = document.createElement('pre');
          detail.className = 'demo-trace-detail';
          detail.textContent = item.detail;
          // 展开状态存在数据里，所以行被回收再重建时不会丢
          detail.hidden = !item.expanded;
          row.appendChild(detail);
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
