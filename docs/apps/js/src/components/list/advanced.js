import { VirtListDOM } from '@virt-list/dom';

const COLUMNS = [
  { key: 'id', title: 'ID', width: 60 },
  { key: 'name', title: '姓名', width: 100 },
  { key: 'age', title: '年龄', width: 60 },
  { key: 'address', title: '地址', width: 200 },
  { key: 'desc1', title: '描述1', width: 300 },
  { key: 'desc2', title: '描述2', width: 300 },
  { key: 'desc3', title: '描述3', width: 300 },
];

function generateList(count) {
  const addresses = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    age: 20 + (i % 40),
    address: addresses[i % addresses.length],
    desc1: `描述信息 ${i}-A`,
    desc2: `描述信息 ${i}-B`,
    desc3: `描述信息 ${i}-C`,
    rowSpan: i < 2 ? 2 : 1,
  }));
}

function createTableCell(text, width, extra) {
  const cell = document.createElement('div');
  cell.className = 'demo-adv-cell';
  cell.style.width = `${width}px`;
  cell.style.minWidth = `${width}px`;
  cell.textContent = text;
  if (extra) Object.assign(cell.style, extra);
  return cell;
}

const template = `
  <div class="demo-panel">
    <p style="font-size:12px;color:#888;margin-bottom:8px;">
      高阶用法：展示类似表格的渲染，包含 sticky 列头和多列数据。前两行进行了合并展示。
    </p>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapAdvanced(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(100);

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      stickyHeaderStyle: 'background:#f5f5f5;',
      renderStickyHeader: () => {
        const header = document.createElement('div');
        header.className = 'demo-table-row demo-table-header';
        header.style.minWidth = 'min-content';
        for (const col of COLUMNS) {
          header.appendChild(
            createTableCell(col.title, col.width, {
              fontWeight: 'bold',
              background: '#e8e8e8',
            }),
          );
        }
        return header;
      },
      renderItem: (item, index) => {
        const row = document.createElement('div');
        row.className = 'demo-table-row';
        row.style.minWidth = 'min-content';

        if (index === 0) {
          const mergedCell = createTableCell(`合并行 (ID: ${item.id} & ${item.id + 1})`, COLUMNS[0].width + COLUMNS[1].width, {
            minWidth: `${COLUMNS[0].width + COLUMNS[1].width}px`,
            background: '#fffbe6',
            fontWeight: 'bold',
          });
          row.appendChild(mergedCell);
          for (let c = 2; c < COLUMNS.length; c++) {
            row.appendChild(createTableCell(String(item[COLUMNS[c].key]), COLUMNS[c].width));
          }
        } else if (index === 1) {
          const mergedCell = createTableCell(`(续) ID: ${item.id}`, COLUMNS[0].width + COLUMNS[1].width, {
            minWidth: `${COLUMNS[0].width + COLUMNS[1].width}px`,
            background: '#fffbe6',
          });
          row.appendChild(mergedCell);
          for (let c = 2; c < COLUMNS.length; c++) {
            row.appendChild(createTableCell(String(item[COLUMNS[c].key]), COLUMNS[c].width));
          }
        } else {
          for (const col of COLUMNS) {
            row.appendChild(createTableCell(String(item[col.key]), col.width));
          }
        }

        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = `总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length} | 高阶表格`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
