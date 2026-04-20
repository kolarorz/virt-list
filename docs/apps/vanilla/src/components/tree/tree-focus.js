import { VirtTree } from '@virt-list/vanilla';
import '@virt-list/vanilla/src/tree/tree.css';

/**
 * 聚焦态由库在 `.virt-tree-node` 上切换 `is-focused` class。
 * 可在业务样式中覆盖，例如：`.virt-tree-node.is-focused { outline: 2px solid #42b983; }`
 */
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
    <div id="focusedDisplay" class="status-text" style="margin-bottom:8px;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeFocus(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const focusedDisplay = root.querySelector('#focusedDisplay');

  const updateFocusedDisplay = (keys) => {
    focusedDisplay.textContent = `focusedKeys: [${keys.map(String).join(', ')}]`;
  };

  const treeRef = { current: null };

  treeRef.current = new VirtTree(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 20,
      selectable: true,
      defaultExpandAll: true,
      focusedKeys: [],
      renderContent: (node) => {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.justifyContent = 'space-between';
        wrap.style.alignItems = 'center';
        wrap.style.width = '100%';

        const titleEl = document.createElement('span');
        titleEl.textContent = `level: ${node.level}; ${node.title ?? ''}`;

        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'virt-list-btn virt-list-btn-secondary';
        moreBtn.textContent = '...';
        moreBtn.style.display = 'none';
        moreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          treeRef.current?.setFocusedKeys([node.key]);
          updateFocusedDisplay([node.key]);
        });

        wrap.addEventListener('mouseenter', () => {
          moreBtn.style.display = '';
        });
        wrap.addEventListener('mouseleave', () => {
          moreBtn.style.display = 'none';
        });

        wrap.appendChild(titleEl);
        wrap.appendChild(moreBtn);
        return wrap;
      },
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
  );

  updateFocusedDisplay([]);

  return () => {
    treeRef.current?.destroy();
    root.innerHTML = '';
  };
}
