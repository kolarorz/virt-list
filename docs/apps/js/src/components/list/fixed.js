import { VirtListDOM } from '@virt-list/dom';

function generateList(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    index: i,
    text: `固定高度行 ${i}，每行高度一致（40px）。`,
  }));
}

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapFixed(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(1000);

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      fixed: true,
      buffer: 2,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-row-item';
        row.style.height = '40px';
        row.style.lineHeight = '40px';
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

  statsEl.textContent = `总数: ${list.length} | 固定高度: 40px`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
