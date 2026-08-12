import { useRef, useMemo } from 'react';
import { VirtTree, type VirtTreeRef, type TreeNode } from '@virt-list/react';
import TreeDragAreaItem from './items/TreeDragAreaItem';
import TreeEmpty from './items/TreeEmpty';

interface TreeRow {
  id: string;
  title: string;
  children?: TreeRow[];
}

function removeNode(list: TreeRow[], node: TreeNode): boolean {
  for (let i = 0; i < list.length; i++) {
    const row = list[i]!;
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

function insertNode(
  list: TreeRow[],
  node: TreeNode,
  prevNode: TreeNode | undefined,
  parentNode: TreeNode | undefined,
) {
  const raw = node.data as TreeRow;
  const pdata = parentNode?.data as TreeRow | undefined;
  const target = pdata ? (pdata.children ??= []) : list;
  if (prevNode) {
    const idx = target.findIndex((n) => n.id === prevNode.data.id);
    target.splice(idx + 1, 0, raw);
  } else {
    target.unshift(raw);
  }
}

export default function TreeDragArea() {
  const treeRef = useRef<VirtTreeRef>(null);
  const treeData = useMemo<TreeRow[]>(
    () => [
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
    ],
    [],
  );

  return (
    <div className="tree-demo">
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          ref={treeRef}
          list={treeData}
          fieldNames={{ key: 'id' }}
          draggable
          crossLevelDraggable={false}
          showLine
          expandOnClickNode
          defaultExpandAll
          itemGap={4}
          indent={16}
          iconSize={14}
          content={({ node }) => <TreeDragAreaItem node={node} />}
          empty={() => <TreeEmpty />}
          onDragstart={(data) => {
            console.log('tree dragstart', data);
          }}
          onDragend={(data) => {
            console.log('tree dragend', data);
            // 落点只是算出来的结果，得自己搬数据再 setList，树才会真的换位
            if (!data) return;
            removeNode(treeData, data.node);
            insertNode(treeData, data.node, data.prevNode, data.parentNode);
            treeRef.current?.setList([...treeData]);
          }}
        />
      </div>
    </div>
  );
}
