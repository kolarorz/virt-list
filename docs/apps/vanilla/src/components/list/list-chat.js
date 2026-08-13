import { VirtList } from '@virt-list/vanilla';

const PAGE_SIZE = 40;

let uid = 0;

// demo:fold 示例数据构造：CHAT_MSGS、generatePage()
const CHAT_MSGS = [
  '好的，收到！',
  '这个方案看起来不错，我觉得可以按这个方向继续推进。',
  '你有空的时候帮我看一下那个 bug 吗？就是用户反馈的列表滚动卡顿问题。',
  '明天的会议改到下午三点了，记得提前准备一下演示材料。',
  '我刚刚测试了一下新版本的虚拟列表组件，在十万条数据的情况下滚动依然非常流畅，完全没有掉帧的情况。之前用全量渲染的方案在五千条数据时就开始卡顿了，这次的优化效果非常明显！',
  '👍',
  '关于上次讨论的技术选型问题，我整理了一份对比文档，包括性能测试数据、社区活跃度、学习成本等方面的分析。总体来看，新方案在各方面都有优势。等你有空了我们再详细讨论一下具体的迁移计划。',
  '周末愉快！',
];

function generatePage(page, pageSize) {
  const start = (page - 1) * pageSize;
  return Array.from({ length: pageSize }, (_, i) => {
    const idx = start + i;
    return {
      id: uid++,
      index: idx,
      text: CHAT_MSGS[idx % CHAT_MSGS.length],
    };
  });
}
// /demo:fold

function asyncGeneratePage(page, pageSize) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(generatePage(page, pageSize)), 800),
  );
}

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" id="sendBtn">发送随机消息</button>
    </div>
  </div>
`;

export function bootstrapChat(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');

  let page = 5;
  let list = generatePage(page, PAGE_SIZE);
  let loadState = null;

  /**
   * 提前声明：loadMore 有可能在构造期间就被调用（首屏内容不足一屏时会自动续拉），
   * 那时 `new VirtList(...)` 还没返回。用 const 声明就会撞上 TDZ 错误。
   */
  let virtList;

  function updateStats(state) {
    const parts = [
      `总数: ${list.length}`,
      `Page: ${page}`,
      `可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'}`,
      `渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}`,
    ];
    if (loadState?.loadingTop) parts.push('加载中...');
    // 用户正在翻历史时收到的新消息数，实际项目里可以拿它渲染「N 条新消息」角标
    const pending = loadState?.pendingNew ?? 0;
    if (pending > 0) parts.push(`${pending} 条新消息`);
    statsEl.textContent = parts.join(' | ');
  }

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 60,
      /**
       * 向上加载更早的消息。
       *
       * 只需取数并写入 list，返回是否还有更早的数据。防重入、加载中不重复触发、
       * 加载后的滚动位置补偿与重新渲染都由组件内部完成。
       */
      loadMore: async (direction) => {
        if (direction !== 'top') return false;
        const prevPage = await asyncGeneratePage(page - 1, PAGE_SIZE);
        page--;
        list = prevPage.concat(list);
        virtList.setList(list);
        return page > 1;
      },
      hasMoreBottom: false,
      initialPosition: 'bottom',
      stickyBottom: true,
      renderHeader: (el, state) => {
        el.className = 'demo-loading-bar';
        el.id = 'chatLoadingBar';
        el.textContent = state.loadingTop
          ? '加载中...'
          : state.hasMoreTop
            ? ''
            : '没有更早的消息了';
      },
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-chat-message';
        row.innerHTML = `
          <div class="demo-chat-bubble">
            <div style="font-weight:bold;margin-bottom:2px;">消息 #${item.index}</div>
            <div>${item.text}</div>
          </div>
        `;
        return row;
      },
    },
    {
      loadStateChange: (state) => {
        loadState = state;
        updateStats(virtList?.core.getState());
      },
      update: (_, state) => updateStats(state),
    },
  );

  updateStats();

  const sendBtn = root.querySelector('#sendBtn');
  /** 发消息只管往列表里加，stickyBottom 负责「贴底时才跟随」 */
  sendBtn.addEventListener('click', () => {
    const text = CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)];
    list = [...list, { id: uid++, index: list.length, text }];
    virtList.setList(list);
  });

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
