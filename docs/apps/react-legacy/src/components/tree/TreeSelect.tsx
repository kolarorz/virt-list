import { useRef, useState, useMemo } from 'react';
import { VirtTree, type VirtTreeRef } from '@virt-list/react-legacy';
import TreeEmpty from './items/TreeEmpty';
import '../../demo.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    disableSelect: i === 1,
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

export default function TreeSelect() {
  const treeRef = useRef<VirtTreeRef>(null);
  const [selectedText, setSelectedText] = useState('selectedKeys: [0]');
  const treeData = useMemo(() => generateTreeData(), []);

  return (
    <div className="tree-demo">
      <div className="tree-btn-container">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() => {
              treeRef.current?.selectAll(true);
              setSelectedText('selectedKeys: [(all)]');
            }}
          >
            全选
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-warning"
            onClick={() => {
              treeRef.current?.selectAll(false);
              setSelectedText('selectedKeys: []');
            }}
          >
            清空选择
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-success"
            onClick={() => treeRef.current?.expandAll(true)}
          >
            展开所有
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-secondary"
            onClick={() => treeRef.current?.expandAll(false)}
          >
            折叠所有
          </button>
        </div>
      </div>
      <div className="status-text" style={{ margin: '8px 0' }}>
        {selectedText}
      </div>
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          ref={treeRef}
          list={treeData}
          fieldNames={{ key: 'id' }}
          indent={20}
          selectable
          selectMultiple
          defaultExpandAll
          selectedKeys={['0']}
          onSelect={(keys) => {
            setSelectedText(`selectedKeys: [${keys.join(', ')}]`);
          }}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
