import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  const data = Array.from({ length: 40 }, (_, i) => ({
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
  data[0].children[0].title =
    'abvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagac';
  return data;
}

const template = `
  <div class="tree-demo">
    <div class="tree-btn-container">
      <button class="virt-list-btn virt-list-btn-primary" id="btnToggleLine">切换连接线</button>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeShowLine(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const listeners = [];
  let showLine = true;

  let tree = createTree(container, showLine);

  function createTree(el, line) {
    el.innerHTML = '';
    return new VirtTreeDOM(el, {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 28,
      iconSize: 14,
      showLine: line,
      defaultExpandAll: true,
      itemGap: 4,
      fixed: true,
      renderEmpty: () => {
        const div = document.createElement('div');
        div.style.padding = '16px';
        div.textContent = '暂无数据';
        return div;
      },
    });
  }

  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnToggleLine', () => {
    showLine = !showLine;
    tree.destroy();
    tree = createTree(container, showLine);
    root.querySelector('#btnToggleLine').textContent = showLine
      ? '隐藏连接线'
      : '显示连接线';
  });

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
