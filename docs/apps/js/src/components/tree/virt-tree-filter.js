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
      })),
    })),
  }));
}

const template = `
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container">
        <input id="filterInput" value="Node-0" style="width:160px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnFilter">filter</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeFilter(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const listeners = [];

  const tree = new VirtTreeDOM(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    filterMethod: (query, node) => {
      return node.title.includes(query);
    },
    renderEmpty: () => {
      const el = document.createElement('div');
      el.style.padding = '16px';
      el.textContent = '暂无数据';
      return el;
    },
  });

  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnFilter', () => {
    const query = root.querySelector('#filterInput').value;
    tree.filter(query);
  });

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
