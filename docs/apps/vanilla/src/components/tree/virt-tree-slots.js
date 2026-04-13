import { VirtTree } from '@virt-list/vanilla';
import '@virt-list/vanilla/src/tree/tree.css';

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
      <div style="display:flex;gap:8px;">
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeSlots(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const listeners = [];

  const tree = new VirtTree(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 20,
      selectable: true,
      defaultExpandAll: true,
      renderStickyHeader: () => {
        const el = document.createElement('div');
        el.textContent = '悬浮header';
        el.style.padding = '10px 12px';
        el.style.background = '#42b983';
        el.style.color = '#fff';
        el.style.fontWeight = '600';
        return el;
      },
      renderHeader: () => {
        const el = document.createElement('div');
        el.textContent = 'header';
        el.style.padding = '8px 12px';
        el.style.background = 'cyan';
        el.style.color = '#1f2329';
        return el;
      },
      renderFooter: () => {
        const el = document.createElement('div');
        el.textContent = 'footer';
        el.style.padding = '8px 12px';
        el.style.background = 'cyan';
        el.style.color = '#1f2329';
        return el;
      },
      renderStickyFooter: () => {
        const el = document.createElement('div');
        el.textContent = '悬浮footer';
        el.style.padding = '10px 12px';
        el.style.background = '#42b983';
        el.style.color = '#fff';
        el.style.fontWeight = '600';
        return el;
      },
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
  );

  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnExpandAll', () => tree.expandAll(true));
  on('btnCollapseAll', () => tree.expandAll(false));

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
