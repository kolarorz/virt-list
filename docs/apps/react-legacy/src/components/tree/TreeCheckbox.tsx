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
        disableCheckbox: k % 2 === 0,
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

export default function TreeCheckbox() {
  const treeRef = useRef<VirtTreeRef>(null);
  const nodeKeyInputRef = useRef<HTMLInputElement>(null);
  const [checkedText, setCheckedText] = useState('checkedKeys: [0]');
  const treeData = useMemo(() => generateTreeData(), []);

  return (
    <div className="tree-demo">
      <div className="tree-btn-container">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={() => treeRef.current?.expandAll(false)}>
            折叠所有
          </button>
          <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={() => treeRef.current?.expandAll(true)}>
            展开所有
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-warning"
            onClick={() => {
              treeRef.current?.checkAll(false);
              setCheckedText('checkedKeys: []');
            }}
          >
            清空 check
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-success"
            onClick={() => {
              const t = treeRef.current;
              if (!t) return;
              t.checkAll(true);
              setCheckedText(`checkedKeys: [${t.getCheckedKeys().join(', ')}]`);
            }}
          >
            check 所有
          </button>
        </div>
        <div className="input-container" style={{ marginTop: 8 }}>
          <label>操作指定节点：</label>
          <input
            ref={nodeKeyInputRef}
            defaultValue="0"
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
      </div>
      <div className="status-text" style={{ margin: '8px 0' }}>
        {checkedText}
      </div>
      <div className="virt-tree-wrapper">
        <VirtTree
          ref={treeRef}
          list={treeData}
          fieldNames={{ key: 'id' }}
          indent={20}
          checkable
          checkOnClickNode
          defaultExpandAll
          checkedKeys={['0']}
          empty={() => <TreeEmpty />}
          onCheck={(keys) => {
            setCheckedText(`checkedKeys: [${keys.join(', ')}]`);
          }}
        />
      </div>
    </div>
  );
}
