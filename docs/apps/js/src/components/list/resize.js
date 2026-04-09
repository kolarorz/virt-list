import { VirtListDOM } from '@virt-list/dom';

const SENTENCES = [
  '拖拽容器右下角可以调整大小，虚拟列表会自动适应新的容器尺寸。',
  '容器变大时会渲染更多的行。',
  '这种自适应能力依赖于 ResizeObserver 对容器尺寸变化的监听。当容器的可视区域发生变化时，虚拟列表会重新计算需要渲染的元素数量，并更新视图。',
  '短行。',
  '无论容器是变大还是变小，滚动位置和列表状态都会被正确保留。这意味着用户在调整窗口大小时不会丢失当前的浏览位置。',
  '每一行的高度都不同，体现了动态高度的特性。',
];

function generateList(count) {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 5) + 1;
    const parts = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-resize-container" id="listContainer"></div>
  </div>
`;

export function bootstrapResize(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(2000);

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      buffer: 2,
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
      rangeUpdate: (begin, end) => {
        statsEl.textContent = `总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length} | 拖拽容器边框调整大小`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
