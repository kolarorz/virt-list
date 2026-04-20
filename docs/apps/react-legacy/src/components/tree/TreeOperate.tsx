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
      })),
    })),
  }));
}

export default function TreeOperate() {
  const treeRef = useRef<VirtTreeRef>(null);
  const [nodeKey, setNodeKey] = useState('0-0');
  const [scrollOffset, setScrollOffset] = useState('0');
  const [scrollKey, setScrollKey] = useState('5');
  const treeData = useMemo(() => generateTreeData(), []);

  return (
    <div className="tree-demo">
      <div className="tree-btn-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            节点 key
            <input
              value={nodeKey}
              onChange={(e) => setNodeKey(e.target.value)}
              style={{ width: 100, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </label>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-success"
            onClick={() => treeRef.current?.expandNode(nodeKey, true)}
          >
            展开节点
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-warning"
            onClick={() => treeRef.current?.expandNode(nodeKey, false)}
          >
            折叠节点
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            scroll offset
            <input
              value={scrollOffset}
              onChange={(e) => setScrollOffset(e.target.value)}
              style={{ width: 100, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </label>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() => {
              const n = Number(scrollOffset);
              if (!Number.isNaN(n) && n >= 0) {
                treeRef.current?.scrollTo({ offset: n });
              }
            }}
          >
            scrollTo offset
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            scroll key
            <input
              value={scrollKey}
              onChange={(e) => setScrollKey(e.target.value)}
              style={{ width: 100, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </label>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-success"
            onClick={() => treeRef.current?.scrollTo({ key: scrollKey, align: 'top' })}
          >
            scrollTo key (top)
          </button>
          <button
            type="button"
            className="virt-list-btn virt-list-btn-secondary"
            onClick={() => treeRef.current?.scrollTo({ key: scrollKey, align: 'view' })}
          >
            scrollTo key (view)
          </button>
        </div>
      </div>
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400, marginTop: 12 }}>
        <VirtTree
          ref={treeRef}
          list={treeData}
          fieldNames={{ key: 'id' }}
          indent={20}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
