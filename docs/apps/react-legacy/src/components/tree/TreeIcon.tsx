import { useMemo } from 'react';
import { VirtTree } from '@virt-list/react-legacy';
import TreeIconItem from './items/TreeIconItem';
import TreeEmpty from './items/TreeEmpty';

// demo:fold 示例数据构造：generateTreeData()
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
// /demo:fold

export default function TreeIcon() {
  const treeData = useMemo(() => generateTreeData(), []);

  return (
    <div className="tree-demo">
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          list={treeData}
          fieldNames={{ key: 'id' }}
          indent={20}
          icon={({ isExpanded }) => <TreeIconItem isExpanded={isExpanded} />}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
