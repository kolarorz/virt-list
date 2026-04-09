import { VirtTree } from '@virt-list/react';
import TreeContentItem from './items/TreeContentItem';
import TreeEmpty from './items/TreeEmpty';
import '../../demo.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    name: `Name-${i}`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: `${i}-${j}`,
      title: `Node-${i}-${j}`,
      name: `Name-${i}-${j}`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: `${i}-${j}-${k}`,
        title: `Node-${i}-${j}-${k}`,
        name: `Name-${i}-${j}-${k}`,
      })),
    })),
  }));
}

export default function TreeContent() {
  return (
    <div className="tree-demo">
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          list={generateTreeData()}
          fieldNames={{ key: 'id' }}
          indent={20}
          content={({ node }) => <TreeContentItem node={node} />}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
