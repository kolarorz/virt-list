import { VirtListDOM } from '@virt-list/dom';

const PAGE_SIZE = 20;
const PAGE_MAX = 10;

let uid = 0;

const PAGE_MSGS = [
  '短消息。',
  '这是一条普通长度的分页消息，展示双向分页加载的效果。',
  '向上滚动会加载更早的数据，向下滚动会加载更新的数据。同时，离开可视区域较远的数据会被移除，以控制内存中的数据量。',
  '分页已加载。',
  '双向分页模式适用于消息列表、日志浏览等场景。用户可以在时间线上自由导航，而不需要一次性加载所有数据。这种模式通过 addedList2Top 和 deletedList2Top 两个 API 来实现数据的动态增删，同时保持滚动位置的稳定。',
  '翻到顶部或底部都可以触发新一页的加载。',
];

function generatePage(page) {
  const start = (page - 1) * PAGE_SIZE;
  return Array.from({ length: PAGE_SIZE }, (_, i) => {
    const idx = start + i;
    return {
      id: uid++,
      index: idx,
      text: PAGE_MSGS[idx % PAGE_MSGS.length],
    };
  });
}

function asyncGeneratePage(page) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(generatePage(page)), 1000),
  );
}

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapPagination(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');

  let page = PAGE_MAX;
  let list = [...generatePage(page - 1), ...generatePage(page)];
  let loadingTop = false;
  let loadingBottom = false;
  let firstResize = true;

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 60,
      buffer: 2,
      renderHeader: () => {
        const el = document.createElement('div');
        el.className = 'demo-loading-bar';
        el.textContent = page > 2 ? '上拉加载...' : '没有更早的数据了';
        return el;
      },
      renderFooter: () => {
        const el = document.createElement('div');
        el.className = 'demo-loading-bar';
        el.textContent = page < PAGE_MAX ? '下拉加载...' : '没有更新的数据了';
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
        if (loadingTop || page <= 2) return;
        loadingTop = true;
        updateStats();

        const prevPageData = await asyncGeneratePage(page - 2);
        page--;

        const removed = list.splice(list.length - PAGE_SIZE, PAGE_SIZE);
        virtList.deletedList2Top(removed);
        list = prevPageData.concat(list);
        virtList.addedList2Top(prevPageData);
        virtList.setList(list);
        virtList.forceUpdate();

        loadingTop = false;
        updateStats();
      },
      toBottom: async () => {
        if (loadingBottom || page >= PAGE_MAX) return;
        loadingBottom = true;
        updateStats();

        const nextPageData = await asyncGeneratePage(page + 1);
        page++;

        const removed = list.splice(0, PAGE_SIZE);
        virtList.deletedList2Top(removed);
        list = list.concat(nextPageData);
        virtList.setList(list);
        virtList.forceUpdate();

        loadingBottom = false;
        updateStats();
      },
      itemResize: () => {
        if (firstResize) {
          firstResize = false;
          virtList.scrollToBottom();
        }
      },
      rangeUpdate: (begin, end) => updateStats(begin, end),
    },
  );

  function updateStats(begin, end) {
    const extra = loadingTop || loadingBottom ? ' | 加载中...' : '';
    statsEl.textContent = `总数: ${list.length} | Page: ${page} | RenderBegin: ${begin ?? '-'} | RenderEnd: ${end ?? '-'}${extra}`;
  }

  updateStats();

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
