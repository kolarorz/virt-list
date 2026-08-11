import { VirtList } from '@virt-list/vanilla';

const PAGE_SIZE = 50;
const PAGE_MAX = 10;

let uid = 0;

const PAGE_MSGS = [
  '短消息。',
  '这是一条普通长度的分页消息，展示双向分页加载的效果。',
  '向上滚动会加载更早的数据，向下滚动会加载更新的数据。同时，离开可视区域较远的数据会被移除，以控制内存中的数据量。',
  '分页已加载。',
  '双向分页模式适用于消息列表、日志浏览等场景。用户可以在时间线上自由导航，而不需要一次性加载所有数据。数据的增删只需要照常改 list，滚动位置由组件自动补偿。',
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
  let loadState = null;

  /**
   * 提前声明：loadMore 有可能在构造期间就被调用，那时 `new VirtList(...)`
   * 还没返回。用 const 声明就会撞上 TDZ 错误。
   */
  let virtList;

  function updateStats(state) {
    const loading = loadState?.loadingTop || loadState?.loadingBottom;
    statsEl.textContent = `总数: ${list.length} | Page: ${page} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}${
      loading ? ' | 加载中...' : ''
    }`;
  }

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 60,
      initialPosition: 'bottom',
      /**
       * 双向分页取数。
       *
       * 一端加一页、另一端裁一页——即使总长度不变，组件也能识别出头部的结构变化
       * 并补偿滚动位置，不需要手动补偿，也不需要 forceUpdate。
       */
      loadMore: async (direction) => {
        if (direction === 'top') {
          if (page <= 2) return false;
          const prevPage = await asyncGeneratePage(page - 2);
          page--;
          list = prevPage.concat(list.slice(0, list.length - PAGE_SIZE));
          virtList.setList(list);
          return page > 2;
        }

        if (page >= PAGE_MAX) return false;
        const nextPage = await asyncGeneratePage(page + 1);
        page++;
        list = list.slice(PAGE_SIZE).concat(nextPage);
        virtList.setList(list);
        return page < PAGE_MAX;
      },
      renderHeader: (el, state) => {
        el.className = 'demo-loading-bar';
        el.textContent = state.loadingTop
          ? '加载中...'
          : state.hasMoreTop
            ? '上拉加载...'
            : '没有更早的数据了';
      },
      renderFooter: (el, state) => {
        el.className = 'demo-loading-bar';
        el.textContent = state.loadingBottom
          ? '加载中...'
          : state.hasMoreBottom
            ? '下拉加载...'
            : '没有更新的数据了';
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

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
