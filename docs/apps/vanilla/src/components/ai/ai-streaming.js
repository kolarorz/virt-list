import { VirtList } from '@virt-list/vanilla';
import {
  createAiMessage,
  fetchAiPage,
  generateAiPage,
  MODEL_NAME,
  QUICK_ASKS,
  sliceIntoChunks,
} from '../../../../_shared/aiData';
import {
  appendToBlock,
  blocksToPlainText,
  buildAnswerScript,
  settleBlock,
  stepHoldFrames,
  stepText,
  stepToBlock,
} from '../../../../_shared/agentBlocks';
import { formatAiStats } from '../../../../_shared/demoStats';
import { createAgentShell } from './parts/agent-shell';
import { createAgentMessage, syncBlock, syncLastBlock } from './parts/agent-message';

const PAGE_SIZE = 20;
/** 每帧输出的间隔，接近真实 SSE 的节奏 */
const TICK = 35;

/** 一次回答的演出脚本：思考 → 工具 → 正文 → 代码 → 工具 → 正文 → 图表 → 来源 */
const SCRIPT = buildAnswerScript();

const PHASE_TEXT = {
  thinking: '正在思考',
  tool: '正在调用工具',
  text: '正在生成回答',
  code: '正在写代码',
  chart: '正在算数据',
  sources: '正在整理来源',
};

export function bootstrapAiStreaming(root) {
  let page = 4;
  let list = generateAiPage(page, PAGE_SIZE);
  let loadState = null;
  let listState = null;

  /** 视口是否贴在底部——决定「回到底部」按钮要不要亮 */
  let atBottom = true;
  /**
   * 正在生成的若干条回答。
   *
   * 每个 run 直接持有那条消息对象——允许多条同时生成之后，
   * 「流式项在末尾」这个前提就没了，用 id 每帧去 list 里找是
   * O(历史条数 × 并发数)。
   */
  let runs = [];
  let timer = null;
  let nodes = 0;
  let lastCountAt = 0;

  const shell = createAgentShell(root, {
    model: MODEL_NAME,
    quickAsks: QUICK_ASKS,
    onSend: ask,
    onStop: stopAll,
  });

  const container = shell.listContainer;
  const statsEl = shell.statsEl;

  const jumpBtn = document.createElement('button');
  jumpBtn.type = 'button';
  jumpBtn.className = 'virt-list-btn';
  jumpBtn.addEventListener('click', () => virtList.scrollToBottom());
  shell.toolbar.appendChild(jumpBtn);

  let virtList;

  /** 渲染一条消息时要带的上下文：折叠状态存在数据里，回调改数据再就地重画那个块 */
  function ctxOf(msg) {
    return {
      streaming: runs.some((r) => r.msg.id === msg.id),
      onToggle: (index) => {
        const block = msg.blocks[index];
        if (!block || !('expanded' in block)) return;
        block.expanded = !block.expanded;
        syncBlock(container, msg, index, ctxOf(msg));
      },
      onRetry: retry,
      onLike: (target) => {
        target.liked = !target.liked;
        virtList.refreshItems([target.id]);
      },
    };
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
    nodes = container.querySelectorAll('*').length;
  }

  function leadStep() {
    return runs.reduce((max, r) => Math.max(max, r.step), 0);
  }

  function refreshUI() {
    const live = runs.length > 0;
    statsEl.textContent = formatAiStats({
      total: list.length,
      streaming: live,
      atBottom,
      step: live ? { done: leadStep(), total: SCRIPT.length } : undefined,
      nodes,
      state: listState,
      loadState,
    });

    shell.setSteps(leadStep(), SCRIPT.length, live);
    shell.setLive(live);
    shell.setPhase(
      !live
        ? '空闲'
        : runs.length > 1
          ? `${runs.length} 条回答同时生成中`
          : (PHASE_TEXT[SCRIPT[leadStep()]?.type] ?? '收尾'),
    );

    jumpBtn.disabled = atBottom;
    const pending = loadState?.pendingNew ?? 0;
    jumpBtn.textContent = pending > 0 ? `回到底部（${pending} 条新消息）` : '回到底部';
  }

  /**
   * 推进一条回答一帧。
   *
   * 一次回答里有两种完全不同的更新：
   *
   * - **插入一个块**（思考、工具卡、代码块、图表、来源）——一次高度跳变，结构变了；
   * - **往块里追加一片文本**——高度连续增长。
   *
   * 两种都不需要 setList：数据改完就地把最后一个块画出来（syncLastBlock），
   * 列表结构与其他项的 DOM 一概不动。高度变化由 ResizeObserver 上报，
   * 贴底跟随随之生效。
   */
  function advance(run) {
    const step = SCRIPT[run.step];
    if (!step) return;

    if (!run.opened) {
      run.msg.blocks.push(stepToBlock(step));
      run.chunks = sliceIntoChunks(stepText(step));
      run.hold = stepHoldFrames(step);
      run.chunk = 0;
      run.opened = true;
      syncLastBlock(container, run.msg, ctxOf(run.msg));
      return;
    }

    const block = run.msg.blocks[run.msg.blocks.length - 1];

    if (run.chunk < run.chunks.length) {
      appendToBlock(block, run.chunks[run.chunk]);
      run.chunk += 1;
      syncLastBlock(container, run.msg, ctxOf(run.msg));
      return;
    }

    // 工具卡与图表多停几帧再落地，让「执行中」「正在算」这两个状态看得见
    if (run.hold > 0) {
      run.hold -= 1;
      return;
    }

    settleBlock(block, step);
    syncLastBlock(container, run.msg, ctxOf(run.msg));
    run.step += 1;
    run.opened = false;
  }

  function tick() {
    for (const run of [...runs]) {
      if (run.step >= SCRIPT.length) finish(run);
      else advance(run);
    }

    if (runs.length === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    refreshUI();
  }

  function startRun(msg) {
    runs = [
      ...runs,
      { msg, step: 0, chunk: 0, chunks: [], hold: 0, opened: false, startedAt: performance.now() },
    ];
    if (timer === null) timer = setInterval(tick, TICK);
    refreshUI();
  }

  /** 一条回答收尾：补上统计、摘掉光标、从活跃列表里移除 */
  function finish(run, aborted = false) {
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

    runs = runs.filter((r) => r !== run);
    // 操作栏要出现、光标要摘掉，这一条整体重画一次（只有这一次）
    virtList.refreshItems([msg.id]);
  }

  function stopAll() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    for (const run of [...runs]) finish(run, true);
    refreshUI();
  }

  /**
   * 提问。
   *
   * 生成过程中再问一次不会被拦住——两条回答会同时生成，
   * 这正是真实 agent 界面的样子，也是对跟随更狠的一档：
   * 同一帧里有两项在变高，而它们未必都在视口里。
   */
  function ask(question) {
    const q = createAiMessage(list.length, 'user', question);
    // 回答以空消息入场，块由演出脚本一步步插进来
    const a = createAiMessage(list.length + 1, 'assistant', '', true);
    list = [...list, q, a];
    virtList.setList(list);
    startRun(a);
  }

  /**
   * 重新生成某条回答。
   *
   * 清空 blocks 会让这一项的高度从几百像素骤降到几十像素——比追加内容更极端的
   * 一种变化。贴底时视口应当立刻收回到新的内容末端，不该留一片空白。
   */
  function retry(msg) {
    if (runs.some((r) => r.msg.id === msg.id)) return;
    msg.blocks = [];
    msg.streaming = true;
    virtList.refreshItems([msg.id]);
    startRun(msg);
  }

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 200,
      initialPosition: 'bottom',
      /**
       * 贴底跟随。这一个配置同时管三件事：
       * 1. 追加消息时，只有原本贴底才跟随（否则累加 pendingNew）
       * 2. 用户手动滚到底 → 重新进入跟随态
       * 3. 跟随中内容变高（流式输出）→ 视口跟着内容走
       */
      stickyBottom: true,
      /** AI 对话没有「更新的消息」要拉，只有历史 */
      hasMoreBottom: false,
      loadMore: async (direction) => {
        if (direction !== 'top') return false;
        const older = await fetchAiPage(page - 1, PAGE_SIZE);
        page -= 1;
        list = older.concat(list);
        virtList.setList(list);
        return page > 1;
      },
      renderHeader: (el, state) => {
        el.className = 'demo-loading-bar';
        el.textContent = state.loadingTop
          ? '加载历史消息...'
          : state.hasMoreTop
            ? ''
            : '没有更早的对话了';
      },
      /**
       * 项滚出视口会被回收，滚回来时这里重新执行——读的是 item.blocks，
       * 也就是流式已经写进数据的全文，所以离屏期间生成的内容不会丢。
       */
      renderItem: (item) => createAgentMessage(item, ctxOf(item)),
    },
    {
      scroll: (e) => {
        atBottom = e.atEnd;
        refreshUI();
      },
      loadStateChange: (state) => {
        loadState = state;
        refreshUI();
      },
      update: (_, state) => {
        listState = state;
        countNodes();
        refreshUI();
      },
    },
  );

  refreshUI();

  return () => {
    if (timer !== null) clearInterval(timer);
    virtList.destroy();
    root.innerHTML = '';
  };
}
