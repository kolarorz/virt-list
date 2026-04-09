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
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeBasic(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');

  const tree = new VirtTreeDOM(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    expandOnClickNode: true,
    renderEmpty: () => {
      const el = document.createElement('div');
      el.style.padding = '16px';
      el.textContent = '暂无数据';
      return el;
    },
  });

  return () => {
    tree.destroy();
    root.innerHTML = '';
  };
}
