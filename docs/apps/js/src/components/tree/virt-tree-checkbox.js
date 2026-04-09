import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: `${i}-${j}`,
      title: `Node-${i}-${j}`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: `${i}-${j}-${k}`,
        title: `Node-${i}-${j}-${k}`,
        disableCheckbox: k % 2 === 0,
        children:
          k % 2 !== 0
            ? []
            : Array.from({ length: 2 }, (_, l) => ({
                id: `${i}-${j}-${k}-${l}`,
                title: `Node-${i}-${j}-${k}-${l}`,
              })),
      })),
    })),
  }));
}

const template = `
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-primary" id="btnCollapseAll">折叠所有</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearCheck">清空 check</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnCheckAll">check 所有</button>
      </div>
      <div class="input-container" style="margin-top:8px;">
        <label>操作指定节点：</label>
        <input id="nodeKeyInput" value="0" style="width:80px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandNode">展开</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseNode">折叠</button>
      </div>
    </div>
    <div id="checkedDisplay" class="status-text" style="margin:8px 0;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeCheckbox(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const checkedDisplay = root.querySelector('#checkedDisplay');
  const listeners = [];

  const updateDisplay = (keys) => {
    checkedDisplay.textContent = `checkedKeys: [${keys.join(', ')}]`;
  };

  const tree = new VirtTreeDOM(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 20,
      checkable: true,
      checkOnClickNode: true,
      defaultExpandAll: true,
      checkedKeys: ['0'],
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      check: (keys, data) => {
        updateDisplay(keys);
        console.warn('check', data);
      },
    },
  );

  updateDisplay(['0']);

  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnCollapseAll', () => tree.expandAll(false));
  on('btnExpandAll', () => tree.expandAll(true));
  on('btnClearCheck', () => {
    tree.checkAll(false);
    updateDisplay([]);
  });
  on('btnCheckAll', () => {
    tree.checkAll(true);
    updateDisplay(tree.getCheckedKeys());
  });
  on('btnExpandNode', () => {
    const key = root.querySelector('#nodeKeyInput').value;
    tree.expandNode(key, true);
  });
  on('btnCollapseNode', () => {
    const key = root.querySelector('#nodeKeyInput').value;
    tree.expandNode(key, false);
  });

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
