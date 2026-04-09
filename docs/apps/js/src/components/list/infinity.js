import { VirtListDOM } from '@virt-list/dom';

let uid = 0;

const SENTENCES = [
  '滚动到底部会自动触发加载更多数据。',
  '新数据加载完成后会追加到列表末尾。',
  '加载过程中 footer 区域会显示加载提示，防止重复触发。数据加载完成后，虚拟列表会自动更新渲染范围，新增的行会无缝衔接到现有内容之后。',
  '短行。',
  '无限加载模式适用于数据量不确定的场景，比如社交媒体的信息流、搜索结果列表等。每次加载一页数据，用户可以一直向下滚动浏览。',
];

function generateList(count, startIndex = 0, delay = 0) {
  const items = Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const n = (idx % 4) + 1;
    const parts = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(idx + s * 2) % SENTENCES.length]);
    return { id: uid++, index: idx, text: parts.join(' ') };
  });
  if (delay <= 0) return Promise.resolve(items);
  return new Promise((resolve) => setTimeout(() => resolve(items), delay));
}

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapInfinity(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');

  let list = [];
  let loading = false;
  let virtList = null;

  function updateStats(begin, end) {
    statsEl.textContent = `总数: ${list.length} | RenderBegin: ${begin ?? '-'} | RenderEnd: ${end ?? '-'}${loading ? ' | 加载中...' : ''}`;
  }

  async function loadMore() {
    if (loading) return;
    loading = true;
    updateStats();
    const newItems = await generateList(200, list.length, 1000);
    list = list.concat(newItems);
    loading = false;

    if (!virtList) {
      virtList = new VirtListDOM(
        container,
        {
          list,
          itemKey: 'id',
          itemPreSize: 40,
          buffer: 2,
          renderFooter: () => {
            const el = document.createElement('div');
            el.className = 'demo-loading-bar';
            el.id = 'loadingBar';
            el.textContent = '加载中...';
            return el;
          },
          renderItem: (item) => {
            const row = document.createElement('div');
            row.className = 'demo-row-item';
            row.innerHTML = `
              <span class="demo-row-index">#${item.index}</span>
              <span class="demo-row-text">${item.text}</span>
            `;
            return row;
          },
        },
        {
          toBottom: () => loadMore(),
          rangeUpdate: (begin, end) => updateStats(begin, end),
        },
      );
    } else {
      virtList.setList(list);
      virtList.forceUpdate();
    }
    updateStats();
  }

  loadMore();

  return () => {
    if (virtList) virtList.destroy();
    root.innerHTML = '';
  };
}
