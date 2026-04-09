import { VirtListDOM } from '@virt-list/dom';

const WIDTHS = [60, 80, 100, 110, 130];

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

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 60,
      horizontal: true,
      buffer: 2,
      renderItem: (item) => {
        const col = document.createElement('div');
        col.className = 'demo-col-item';
        col.style.minWidth = `${item.width}px`;
        col.style.width = `${item.width}px`;
        col.innerHTML = `
          <div style="font-weight:bold;">${item.id}</div>
          <div style="font-size:11px;color:#999;">w:${item.width}</div>
        `;
        return col;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = `总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length} | 水平滚动`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
