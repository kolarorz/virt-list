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
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

function createChevronIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '4');
  svg.setAttribute('stroke-linecap', 'butt');
  svg.setAttribute('stroke-linejoin', 'miter');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M39.6 17.443 24.043 33 8.487 17.443');
  svg.appendChild(path);
  return svg;
}

export function bootstrapTreeIcon(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');

  const tree = new VirtTree(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    expandOnClickNode: true,
    renderIcon: () => createChevronIcon(),
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
