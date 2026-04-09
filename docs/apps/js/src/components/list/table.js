import { VirtListDOM } from '@virt-list/dom';

function generateList(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    desc1: `这是用户 ${i} 的详细描述信息，可能是一段较长的文本`,
    desc2: `补充说明 ${i}，包含更多关于该用户的信息`,
    action: '操作',
  }));
}

function createCell(text, style) {
  const cell = document.createElement('div');
  cell.className = 'demo-table-cell';
  cell.textContent = text;
  if (style) Object.assign(cell.style, style);
  return cell;
}

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapTable(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(1000);

  const stickyLeft = {
    position: 'sticky',
    left: '0',
    zIndex: '1',
    background: '#fff',
  };
  const stickyRight = {
    position: 'sticky',
    right: '0',
    zIndex: '1',
    background: '#fff',
  };

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      stickyHeaderStyle: 'background:#f0f0f0;',
      renderStickyHeader: () => {
        const header = document.createElement('div');
        header.className = 'demo-table-row demo-table-header';
        header.appendChild(
          createCell('ID', { ...stickyLeft, width: '80px', minWidth: '80px', background: '#e0e0e0' }),
        );
        header.appendChild(
          createCell('名称', { width: '120px', minWidth: '120px' }),
        );
        header.appendChild(
          createCell('描述1', { width: '600px', minWidth: '600px' }),
        );
        header.appendChild(
          createCell('描述2', { width: '600px', minWidth: '600px' }),
        );
        header.appendChild(
          createCell('操作', { ...stickyRight, width: '80px', minWidth: '80px', background: '#e0e0e0' }),
        );
        return header;
      },
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-table-row';
        row.appendChild(
          createCell(String(item.id), { ...stickyLeft, width: '80px', minWidth: '80px' }),
        );
        row.appendChild(
          createCell(item.name, { width: '120px', minWidth: '120px' }),
        );
        row.appendChild(
          createCell(item.desc1, { width: '600px', minWidth: '600px' }),
        );
        row.appendChild(
          createCell(item.desc2, { width: '600px', minWidth: '600px' }),
        );
        const actionCell = createCell('', {
          ...stickyRight,
          width: '80px',
          minWidth: '80px',
        });
        const btn = document.createElement('button');
        btn.className = 'virt-list-btn virt-list-btn-primary';
        btn.style.fontSize = '10px';
        btn.style.padding = '2px 8px';
        btn.textContent = '详情';
        actionCell.appendChild(btn);
        row.appendChild(actionCell);
        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = `总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length} | 表格模式（水平滚动 + sticky 列）`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
