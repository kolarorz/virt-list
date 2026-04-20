import { VirtTree } from '@virt-list/react-legacy';
import TreeEmpty from './items/TreeEmpty';
import '../../demo.css';

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

export default function TreeBasic() {
  return (
    <div className="tree-demo">
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          list={generateTreeData()}
          fieldNames={{ key: 'id' }}
          indent={20}
          expandOnClickNode
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
