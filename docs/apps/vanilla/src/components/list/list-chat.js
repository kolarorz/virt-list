import { VirtList } from '@virt-list/vanilla';

const PAGE_SIZE = 40;

let uid = 0;

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
  let loading = false;
  let firstResize = true;

  function updateStats(state) {
    statsEl.textContent = `总数: ${list.length} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}${loading ? ' | 加载中...' : ''}`;
  }

  const virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 60,
      renderHeader: () => {
        const el = document.createElement('div');
        el.className = 'demo-loading-bar';
        el.id = 'chatLoadingBar';
        el.textContent = page > 1 ? '加载中...' : '没有更早的消息了';
        return el;
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
      toTop: async () => {
        if (loading || page <= 1) return;
        loading = true;
        statsEl.textContent += ' | 加载中...';
        const prevPage = await asyncGeneratePage(page - 1, PAGE_SIZE);
        page--;
        list = prevPage.concat(list);
        virtList.setList(list);
        virtList.addedList2Top(prevPage);
        virtList.forceUpdate();
        loading = false;
        updateStats();
      },
      itemResize: () => {
        if (firstResize) {
          firstResize = false;
          virtList.scrollToBottom();
        }
      },
      update: (_, state) => {
        statsEl.textContent = `总数: ${list.length} | Page: ${page} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
      },
    },
  );

  updateStats();

  const sendBtn = root.querySelector('#sendBtn');
  sendBtn.addEventListener('click', () => {
    const text = CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)];
    const newItem = { id: uid++, index: list.length, text };
    list.push(newItem);
    virtList.setList([...list]);
    virtList.forceUpdate();
    requestAnimationFrame(() => {
      virtList.scrollToBottom();
    });
    updateStats();
  });

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
