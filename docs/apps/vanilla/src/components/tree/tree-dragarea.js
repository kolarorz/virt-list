import { VirtTree } from '@virt-list/vanilla';
import '@virt-list/vanilla/src/tree/tree.css';

const treeData = [
  {
    id: 'role',
    title: '角色',
    children: [
      { id: 'role-1', title: '怪物' },
      { id: 'role-2', title: '小动物' },
      { id: 'role-3', title: '路人' },
      { id: 'role-4', title: '武器' },
    ],
  },
  {
    id: 'scene',
    title: '场景',
    children: [
      { id: 'scene-1', title: '场景地域' },
      { id: 'scene-2', title: '室内区域' },
      { id: 'scene-3', title: '室外区域' },
      { id: 'scene-4', title: '特色区域' },
    ],
  },
  {
    id: 'origin',
    title: '原始',
    children: [
      { id: 'origin-1', title: '原始' },
      { id: 'origin-2', title: '3D' },
      { id: 'origin-3', title: 'NPC' },
      { id: 'origin-4', title: '手枪' },
    ],
  },
  { id: 'drag-1', title: '角色环节', children: [] },
  { id: 'drag-2', title: '场景环节', children: [] },
  { id: 'drag-3', title: '测试', children: [] },
];

const template = `
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;

function removeNode(list, node) {
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (row.id === node.data.id) {
      list.splice(i, 1);
      return true;
    }
    if (row.children?.length && removeNode(row.children, node)) {
      return true;
    }
  }
  return false;
}

function insertNode(list, node, prevNode, parentNode) {
  const raw = node.data;
  const target = parentNode
    ? (parentNode.data.children ??= [])
    : list;
  if (prevNode) {
    const idx = target.findIndex((n) => n.id === prevNode.data.id);
    target.splice(idx + 1, 0, raw);
  } else {
    target.unshift(raw);
  }
}

export function bootstrapTreeDragArea(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');

  const tree = new VirtTree(
    container,
    {
      list: treeData,
      fieldNames: { key: 'id' },
      draggable: true,
      crossLevelDraggable: false,
      showLine: true,
      expandOnClickNode: true,
      defaultExpandAll: true,
      itemGap: 4,
      indent: 16,
      iconSize: 14,
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      dragstart: (data) => {
        console.log('dragstart', data);
      },
      dragend: (data) => {
        if (!data) {
          console.log('dragend', 'fail', 'cancelled');
          return;
        }
        console.log('dragend', 'success', data);
        // 落点只是算出来的结果，得自己搬数据再 setList，树才会真的换位
        removeNode(treeData, data.node);
        insertNode(treeData, data.node, data.prevNode, data.parentNode);
        tree.setList([...treeData]);
      },
    },
  );

  return () => {
    tree.destroy();
    root.innerHTML = '';
  };
}
