import { useRef, useMemo } from 'react';
import { VirtTree, type VirtTreeRef } from '@virt-list/react-legacy';
import TreeStickyHeader from './items/TreeStickyHeader';
import TreeHeader from './items/TreeHeader';
import TreeFooter from './items/TreeFooter';
import TreeStickyFooter from './items/TreeStickyFooter';
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

export default function TreeSlots() {
  const treeRef = useRef<VirtTreeRef>(null);
  const treeData = useMemo(() => generateTreeData(), []);

  return (
    <div className="tree-demo">
      <div className="tree-btn-container" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          ref={treeRef}
          list={treeData}
          fieldNames={{ key: 'id' }}
          selectable
          defaultExpandAll
          stickyHeader={() => <TreeStickyHeader />}
          header={() => <TreeHeader />}
          footer={() => <TreeFooter />}
          stickyFooter={() => <TreeStickyFooter />}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
