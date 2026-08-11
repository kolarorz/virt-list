import { VirtList } from '@virt-list/vanilla';

const WIDTHS = [76, 92, 108, 124, 148];

function generateList(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    width: WIDTHS[Math.floor(Math.random() * WIDTHS.length)],
  }));
}

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-horizontal-container" id="listContainer"></div>
  </div>
`;

export function bootstrapHorizontal(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(1000);

  const virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 108,
      horizontal: true,
      renderItem: (item) => {
        const col = document.createElement('div');
        col.className = 'demo-col-item';
        col.style.minWidth = `${item.width}px`;
        col.style.width = `${item.width}px`;
        col.innerHTML = `
          <div class="demo-col-card">
            <span class="demo-col-index">${item.id}</span>
            <span class="demo-col-size">${item.width}px</span>
          </div>
        `;
        return col;
      },
    },
    {
      update: (_, state) => {
        statsEl.textContent = `总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length} | 水平滚动`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
