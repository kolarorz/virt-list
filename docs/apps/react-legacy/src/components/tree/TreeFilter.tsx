import { useRef } from 'react';
import { VirtTree, type VirtTreeRef } from '@virt-list/react-legacy';
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

export default function TreeFilter() {
  const treeRef = useRef<VirtTreeRef>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="tree-demo">
      <div className="tree-btn-container">
        <div className="input-container">
          <input
            ref={filterInputRef}
            defaultValue="Node-0"
            style={{ width: 160, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }}
          />
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() => {
              const query = filterInputRef.current?.value ?? '';
              treeRef.current?.filter(query);
            }}
          >
            filter
          </button>
        </div>
      </div>
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          ref={treeRef}
          list={generateTreeData()}
          fieldNames={{ key: 'id' }}
          indent={20}
          filterMethod={(query, node) => (node.title ?? '').includes(query)}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
