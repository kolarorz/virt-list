import { useRef, useMemo } from 'react';
import { VirtTree, type VirtTreeRef } from '@virt-list/react-legacy';
import TreeDragAreaItem from './items/TreeDragAreaItem';
import TreeEmpty from './items/TreeEmpty';
import '../../demo.css';

export default function TreeDragArea() {
  const treeRef = useRef<VirtTreeRef>(null);
  const treeData = useMemo(
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
          }}
        />
      </div>
    </div>
  );
}
