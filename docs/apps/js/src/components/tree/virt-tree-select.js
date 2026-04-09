import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    disableSelect: i === 1,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: `${i}-${j}`,
      title: `Node-${i}-${j}`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: `${i}-${j}-${k}`,
        title: `Node-${i}-${j}-${k}`,
      })),
    })),
  }));
}

const template = `
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-primary" id="btnSelectAll">全选</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearSelect">清空选择</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
      </div>
    </div>
    <div id="selectedDisplay" class="status-text" style="margin:8px 0;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeSelect(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const selectedDisplay = root.querySelector('#selectedDisplay');
  const listeners = [];

  const updateDisplay = (keys) => {
    selectedDisplay.textContent = `selectedKeys: [${keys.join(', ')}]`;
  };

  const tree = new VirtTreeDOM(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 20,
      selectable: true,
      selectMultiple: true,
      defaultExpandAll: true,
      selectedKeys: ['0'],
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      select: (keys, data) => {
        updateDisplay(keys);
        console.log('onSelect', keys, data);
      },
    },
  );

  updateDisplay(['0']);

  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnSelectAll', () => {
    tree.selectAll(true);
    updateDisplay(['(all)']);
  });
  on('btnClearSelect', () => {
    tree.selectAll(false);
    updateDisplay([]);
  });
  on('btnExpandAll', () => tree.expandAll(true));
  on('btnCollapseAll', () => tree.expandAll(false));

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
