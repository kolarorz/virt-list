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
      <div class="input-container" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">
        <label>目标 key：</label>
        <input id="scrollKeyInput" value="5-1-0" style="width:120px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <label>滚动 offset：</label>
        <input id="scrollOffsetInput" value="400" type="number" min="0" style="width:100px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandNode">expandNode</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnCollapseNode">collapseNode</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnScrollOffset">滚动到指定位置</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnScrollTop">滚动到指定节点(顶部)</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnScrollView">滚动到指定节点(可视区)</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeOperate(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const keyInput = root.querySelector('#scrollKeyInput');
  const offsetInput = root.querySelector('#scrollOffsetInput');
  const listeners = [];

  const tree = new VirtTreeDOM(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    expandedKeys: ['0'],
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

  on('btnExpandAll', () => tree.expandAll(true));
  on('btnCollapseAll', () => tree.expandAll(false));
  on('btnExpandNode', () => {
    const key = keyInput.value.trim();
    if (key) tree.expandNode(key, true);
  });
  on('btnCollapseNode', () => {
    const key = keyInput.value.trim();
    if (key) tree.expandNode(key, false);
  });
  on('btnScrollOffset', () => {
    const v = Number(offsetInput.value);
    if (Number.isFinite(v) && v >= 0) {
      tree.scrollTo({ offset: v });
    }
  });
  on('btnScrollTop', () => {
    const key = keyInput.value.trim();
    if (key) tree.scrollTo({ key, align: 'top' });
  });
  on('btnScrollView', () => {
    const key = keyInput.value.trim();
    if (key) tree.scrollTo({ key, align: 'view' });
  });

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
