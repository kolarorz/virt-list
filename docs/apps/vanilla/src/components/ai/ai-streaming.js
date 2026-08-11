import { VirtList } from '@virt-list/vanilla';
import {
  createAiMessage,
  fetchAiPage,
  generateAiPage,
  randomAsk,
  sliceIntoChunks,
  STREAM_ANSWER,
} from '../../../../_shared/aiData';
import { formatAiStats } from '../../../../_shared/demoStats';

const PAGE_SIZE = 20;
/** 每帧输出的间隔，接近真实 SSE 的节奏 */
const TICK = 45;

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" id="askBtn">提问</button>
      <button type="button" class="virt-list-btn" id="stopBtn">停止生成</button>
      <button type="button" class="virt-list-btn" id="jumpBtn">回到底部</button>
    </div>
  </div>
`;

export function bootstrapAiStreaming(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const askBtn = root.querySelector('#askBtn');
  const stopBtn = root.querySelector('#stopBtn');
  const jumpBtn = root.querySelector('#jumpBtn');

  let page = 4;
  let list = generateAiPage(page, PAGE_SIZE);
  let loadState = null;
  let listState = null;

  /** 视口是否贴在底部——决定「回到底部」按钮要不要亮 */
  let atBottom = true;
  /** 正在生成的那条消息，null 表示空闲 */
  let streamingMsg = null;
  let timer = null;

  let virtList;

  /**
   * 把流式文本刷到 DOM。
   *
   * 关键：**不走 setList**。DOM 层对已在 pool 中的 key 不会重新 renderItem
   * （见 vanilla/VirtList.ts 的 _patch），所以这里直接改那一个文本节点——
   * 这也正是流式该有的开销：列表结构、其他项的 DOM 一概不动。
   *
   * 高度变化不需要通知组件：ResizeObserver 会量到并自动上报，
   * 贴底跟随随之生效。
   */
  function paintStreamingText(msg) {
    const el = container.querySelector(`[data-id="${msg.id}"] .demo-ai-text`);
    if (el) el.textContent = msg.text;
  }

  function updateStats() {
    statsEl.textContent = formatAiStats({
      total: list.length,
      streaming: !!streamingMsg,
      atBottom,
      state: listState,
      loadState,
    });
  }

  function updateToolbar() {
    askBtn.disabled = !!streamingMsg;
    stopBtn.disabled = !streamingMsg;
    // 已经贴底就没有「回到底部」可言；未读条数由组件的 pendingNew 给出
    jumpBtn.disabled = atBottom;
    const pending = loadState?.pendingNew ?? 0;
    jumpBtn.textContent =
      pending > 0 ? `回到底部（${pending} 条新消息）` : '回到底部';
  }

  function refreshUI() {
    updateStats();
    updateToolbar();
  }

  function stopStream() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    if (streamingMsg) {
      streamingMsg.streaming = false;
      // 光标同样不能靠重渲染去掉，就地摘掉它
      const caret = container.querySelector(
        `[data-id="${streamingMsg.id}"] .demo-ai-caret`,
      );
      caret?.remove();
      streamingMsg = null;
    }
    refreshUI();
  }

  function ask() {
    if (streamingMsg) return;

    const question = createAiMessage(list.length, 'user', randomAsk());
    const answer = createAiMessage(list.length + 1, 'assistant', '', true);
    // 两条一起追加：贴底时组件会跟随到底，未贴底则只累加 pendingNew
    list = [...list, question, answer];
    streamingMsg = answer;
    virtList.setList(list);
    refreshUI();

    const chunks = sliceIntoChunks(STREAM_ANSWER);
    let i = 0;
    timer = setInterval(() => {
      if (i >= chunks.length) {
        stopStream();
        return;
      }
      answer.text += chunks[i];
      i += 1;
      paintStreamingText(answer);
    }, TICK);
  }

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 80,
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
       * 项滚出视口会被回收，滚回来时这里重新执行——读的是 item.text，
       * 也就是流式已经写进数据的全文，所以离屏期间生成的内容不会丢。
       */
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className =
          item.role === 'user'
            ? 'demo-chat-message demo-ai-row is-user'
            : 'demo-chat-message demo-ai-row';

        const bubble = document.createElement('div');
        bubble.className = 'demo-chat-bubble';

        const text = document.createElement('span');
        text.className = 'demo-ai-text';
        text.textContent = item.text;
        bubble.appendChild(text);

        if (item.streaming) {
          const caret = document.createElement('span');
          caret.className = 'demo-ai-caret';
          bubble.appendChild(caret);
        }

        row.appendChild(bubble);
        return row;
      },
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
        refreshUI();
      },
    },
  );

  askBtn.addEventListener('click', ask);
  stopBtn.addEventListener('click', stopStream);
  jumpBtn.addEventListener('click', () => virtList.scrollToBottom());

  refreshUI();

  return () => {
    if (timer !== null) clearInterval(timer);
    virtList.destroy();
    root.innerHTML = '';
  };
}
