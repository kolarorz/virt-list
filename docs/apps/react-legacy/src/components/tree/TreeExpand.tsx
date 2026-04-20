import { useRef, useState, useMemo } from 'react';
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
        children:
          k % 2 !== 0
            ? []
            : Array.from({ length: 2 }, (_, l) => ({
                id: `${i}-${j}-${k}-${l}`,
                title: `Node-${i}-${j}-${k}-${l}`,
              })),
      })),
    })),
  }));
}

export default function TreeExpand() {
  const treeRef = useRef<VirtTreeRef>(null);
  const nodeKeyInputRef = useRef<HTMLInputElement>(null);
  const [expandedText, setExpandedText] = useState('expandedKeys: [0-0]');
  const treeData = useMemo(() => generateTreeData(), []);

  return (
    <div className="tree-demo">
      <div className="tree-btn-container">
        <div className="input-container">
          <label>操作指定节点：</label>
          <input
            ref={nodeKeyInputRef}
            defaultValue="0-0"
            style={{ width: 80, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }}
          />
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() => {
              const key = nodeKeyInputRef.current?.value ?? '';
              treeRef.current?.expandNode(key, true);
            }}
          >
            展开
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-secondary"
            onClick={() => {
              const key = nodeKeyInputRef.current?.value ?? '';
              treeRef.current?.expandNode(key, false);
            }}
          >
            折叠
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() => treeRef.current?.expandAll(false)}
          >
            折叠所有
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-success"
            onClick={() => treeRef.current?.expandAll(true)}
          >
            展开所有
          </button>
        </div>
      </div>
      <div className="status-text" style={{ margin: '8px 0', height: 40, overflow: 'auto' }}>
        {expandedText}
      </div>
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          ref={treeRef}
          list={treeData}
          fieldNames={{ key: 'id' }}
          expandedKeys={['0-0']}
          onExpand={(keys) => {
            setExpandedText(`expandedKeys: [${keys.join(', ')}]`);
          }}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
