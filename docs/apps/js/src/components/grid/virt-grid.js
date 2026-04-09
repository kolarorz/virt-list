import { faker } from '@faker-js/faker';
import { VirtGridDOM } from '@virt-list/dom';

function generateData(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: faker.string.nanoid(),
    index: i,
    avatar: faker.image.avatar(),
    name: faker.person.firstName(),
  }));
}

const template = `
  <div class="virt-grid-demo">
    <div class="virt-grid-controls">
      <span>gridItems:</span>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid2">2</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid3">3</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid4">4</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid5">5</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid6">6</button>
    </div>
    <div id="status" class="status-text"></div>
    <div class="virt-grid-container" id="gridContainer"></div>
  </div>
`;

export function bootstrapVirtGrid(root) {
  root.innerHTML = template;

  const container = root.querySelector('#gridContainer');
  const status = root.querySelector('#status');
  const list = generateData(1000);
  const listeners = [];

  const grid = new VirtGridDOM(container, {
    list,
    gridItems: 2,
    itemKey: 'id',
    itemPreSize: 70,
    renderCell: (item, index, rowIndex) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.innerHTML = `
        <div>
          <div style="font-size:12px;color:#999;">row:${rowIndex} - item:${index}</div>
          <div style="display:flex;align-items:center;">
            <img src="${item.avatar}" style="width:40px;height:40px;border-radius:50%;" />
            <span style="margin-left:6px;">${item.name}</span>
          </div>
        </div>
        <button class="grid-delete-btn" data-id="${item.id}">delete</button>
      `;

      const deleteBtn = cell.querySelector('.grid-delete-btn');
      deleteBtn.addEventListener('click', () => {
        const idx = list.findIndex((v) => v.id === item.id);
        if (idx > -1) {
          list.splice(idx, 1);
          grid.setList(list);
          status.textContent = `已删除 item ${index}，剩余 ${list.length} 项`;
        }
      });
      return cell;
    },
  }, {
    toTop: () => {
      status.textContent = '已滚动到顶部';
    },
  });

  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  [2, 3, 4, 5, 6].forEach((n) => {
    on(`btnGrid${n}`, () => {
      grid.setGridItems(n);
      status.textContent = `gridItems 已设为 ${n}`;
    });
  });

  status.textContent = '网格示例已就绪：1000 项数据，2 列';

  return () => {
    grid.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
