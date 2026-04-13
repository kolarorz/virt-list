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

export function bootstrapTreeDefault(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const indent = 20;

  const treeRef = { current: null };

  treeRef.current = new VirtTree(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent,
      selectable: true,
      defaultExpandAll: true,
      expandOnClickNode: true,
      itemPreSize: 40,
      fixed: true,
      renderNode: (node) => {
        const el = document.createElement('div');
        el.className = 'virt-tree-node';
        el.style.height = '40px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.borderBottom = '1px solid #eee';
        el.style.boxSizing = 'border-box';
        el.style.paddingLeft = `${(node.level - 1) * indent}px`;
        el.textContent = `level: ${node.level}; -- title: ${node.title ?? ''}`;

        el.addEventListener('click', () => {
          const t = treeRef.current;
          if (!t) return;
          const current = t.getTreeNode(node.key);
          if (!current || current.disableSelect) return;
          t.toggleSelect(current);
        });

        return el;
      },
      renderEmpty: () => {
        const empty = document.createElement('div');
        empty.style.padding = '16px';
        empty.textContent = '暂无数据';
        return empty;
      },
    },
  );

  return () => {
    treeRef.current?.destroy();
    root.innerHTML = '';
  };
}
