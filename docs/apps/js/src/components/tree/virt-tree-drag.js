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

function removeNode(list, node) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === node.data.id) {
      list.splice(i, 1);
      return true;
    }
    if (list[i].children && removeNode(list[i].children, node)) {
      return true;
    }
  }
  return false;
}

function insertNode(list, node, prevNode, parentNode) {
  const raw = node.data;
  if (parentNode) {
    if (!parentNode.data.children) parentNode.data.children = [];
    const target = parentNode.data.children;
    if (prevNode) {
      const idx = target.findIndex((n) => n.id === prevNode.data.id);
      target.splice(idx + 1, 0, raw);
    } else {
      target.unshift(raw);
    }
  } else {
    if (prevNode) {
      const idx = list.findIndex((n) => n.id === prevNode.data.id);
      list.splice(idx + 1, 0, raw);
    } else {
      list.unshift(raw);
    }
  }
}

const template = `
  <div class="tree-demo">
    <div id="status" class="status-text" style="margin-bottom:8px;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

export function bootstrapTreeDrag(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const status = root.querySelector('#status');
  let list = generateTreeData();

  let tree = new VirtTreeDOM(
    container,
    {
      list,
      fieldNames: { key: 'id' },
      indent: 20,
      draggable: true,
      expandOnClickNode: true,
      renderContent: (node) => {
        const el = document.createElement('div');
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '4px';
        const icon = document.createElement('span');
        icon.textContent = node.isLeaf ? '📄' : '📁';
        const text = document.createElement('span');
        text.textContent = node.title ?? '';
        el.appendChild(icon);
        el.appendChild(text);
        return el;
      },
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      dragstart: (data) => {
        status.textContent = `开始拖拽: ${data.sourceNode.title ?? data.sourceNode.data?.id}`;
      },
      dragend: (data) => {
        if (!data) {
          status.textContent = '拖拽取消';
          return;
        }
        removeNode(list, data.node);
        insertNode(list, data.node, data.prevNode, data.parentNode);
        tree.setList([...list]);
        status.textContent = `拖拽完成: ${data.node.title ?? data.node.data?.id}`;
      },
    },
  );

  status.textContent = '拖拽树示例已就绪（支持跨层级拖拽）';

  return () => {
    tree.destroy();
    root.innerHTML = '';
  };
}
